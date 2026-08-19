// The imperative "engine" bridge — owns the physics world, the SVG stage
// interactions, and the 60fps render loop, none of which belong in
// React's re-render model. Exposes a useSyncExternalStore-compatible
// store (subscribe/getSnapshot) for the UI-relevant slice of that state,
// plus action functions the React components call on user events.
import {
  createWorld,
  destroy,
  clear,
  clearChildren,
  startLoop,
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
  serializeScene,
  loadScene,
  DEFAULT_GRAVITY,
  saveScene,
  openScene,
  spawnBall,
  randomBallColor,
} from "@bloobitygook/engine";
import { findBallAt, isGravityMarkerVisible, isPlaceGravityButtonEnabled, statusText } from "./ui-helpers.js";
import { isCloudEnabled, publishScene, fetchPublishedScene } from "./publish.js";

const BOUNDS = { floorY: 560, left: 0, right: 800 };
const world = createWorld();

let gravity = { mode: "uniform", magnitude: 900, x: 400, y: 300 };
let mode = "setup"; // "setup" (frozen, editable) or "running" (physics live)
let selected = null;
let placingGravityPoint = false;
let fileHandle = null; // reused so repeat Saves overwrite in place, not re-prompt
let status = ""; // blank until a game's Stage mounts and initEngine() sets a real message

let stageEl = null;
let worldEl = null;
let gravityMarkerEl = null;
let stopLoop = null; // set once startLoop() runs; disposeEngine() calls it and clears it

let snapshot = computeSnapshot();
const listeners = new Set();

function computeSnapshot() {
  return {
    mode,
    gravity,
    selected: selected
      ? { radius: selected.radius, color: selected.color, restitution: selected.restitution, friction: selected.friction }
      : null,
    placeGravityBtnEnabled: isPlaceGravityButtonEnabled(mode, gravity),
    status,
  };
}

function notify() {
  snapshot = computeSnapshot();
  listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return snapshot;
}

function updateGravityMarker() {
  if (!gravityMarkerEl) return;
  if (isGravityMarkerVisible(gravity)) {
    gravityMarkerEl.style.display = "";
    gravityMarkerEl.setAttribute("transform", `translate(${gravity.x} ${gravity.y})`);
  } else {
    gravityMarkerEl.style.display = "none";
  }
}

function syncBallVisual(entity) {
  entity.circleEl.setAttribute("r", entity.radius);
  entity.circleEl.setAttribute("fill", entity.color);
}

function selectEntityInternal(entity) {
  if (selected) selected.circleEl.removeAttribute("stroke");
  selected = entity;
  selected.circleEl.setAttribute("stroke", "#ffffff");
  selected.circleEl.setAttribute("stroke-width", "3");
}

function clearSelectionInternal() {
  if (selected) selected.circleEl.removeAttribute("stroke");
  selected = null;
}

export function clearSelection() {
  clearSelectionInternal();
  notify();
}

export function updateSelectedProp(key, value) {
  if (!selected) return;
  selected[key] = value;
  if (key === "radius" || key === "color") syncBallVisual(selected);
  notify();
}

export function deleteSelected() {
  if (!selected) return;
  destroy(world, selected.id);
  selected.el.remove();
  clearSelection();
}

export function setMode(next) {
  mode = next;
  if (mode !== "setup") {
    placingGravityPoint = false;
    clearSelectionInternal();
  }
  status = statusText(mode);
  notify();
}

export function setGravityMode(nextMode) {
  gravity = { ...gravity, mode: nextMode };
  placingGravityPoint = false;
  updateGravityMarker();
  notify();
}

export function setGravityMagnitude(magnitude) {
  gravity = { ...gravity, magnitude };
  notify();
}

export function armGravityPlacement() {
  if (!isPlaceGravityButtonEnabled(mode, gravity)) return;
  placingGravityPoint = true;
  status = "Click the stage to place the gravity point";
  notify();
}

export function handleStagePointerDown(clientX, clientY) {
  const pt = stageEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const { x, y } = pt.matrixTransform(stageEl.getScreenCTM().inverse());

  if (placingGravityPoint) {
    gravity = { ...gravity, x, y };
    placingGravityPoint = false;
    updateGravityMarker();
    status = "Gravity point placed";
    notify();
    return;
  }

  if (mode !== "setup") return;

  const hit = findBallAt(world, x, y);
  if (hit) {
    selectEntityInternal(hit);
    notify();
    return;
  }

  const ball = spawnBall(world, worldEl, {
    x,
    y: Math.min(y, BOUNDS.floorY - 20),
    radius: 16 + Math.random() * 24,
    color: randomBallColor(),
    restitution: 0.5 + Math.random() * 0.4,
    friction: 0.1 + Math.random() * 0.3,
  });
  selectEntityInternal(ball);
  notify();
}

export async function saveSceneToFile() {
  try {
    fileHandle = await saveScene(serializeScene(world, gravity), { handle: fileHandle });
    status = "Scene saved";
  } catch (err) {
    if (err.name !== "AbortError") status = `Save failed: ${err.message}`;
  }
  notify();
}

export async function openSceneFromFile() {
  try {
    const { data, handle } = await openScene();
    fileHandle = handle;
    gravity = loadScene(world, worldEl, data);
    clearSelectionInternal();
    updateGravityMarker();
    status = "Scene loaded";
  } catch (err) {
    if (err.name !== "AbortError") status = `Open failed: ${err.message}`;
  }
  notify();
}

export async function publishCurrentScene(sceneId) {
  try {
    await publishScene(sceneId, serializeScene(world, gravity));
    status = `Published "${sceneId}"`;
  } catch (err) {
    status = `Publish failed: ${err.message}`;
  }
  notify();
}

export async function loadSceneFromCloud(sceneId) {
  try {
    const data = await fetchPublishedScene(sceneId);
    gravity = loadScene(world, worldEl, data);
    clearSelectionInternal();
    updateGravityMarker();
    status = `Loaded "${sceneId}" from cloud`;
  } catch (err) {
    status = `Cloud load failed: ${err.message}`;
  }
  notify();
}

export function setStatus(text) {
  status = text;
  notify();
}

function update(dt) {
  if (mode !== "running") return; // setup mode freezes the simulation for editing
  gravitySystem(world, dt, gravity);
  integrateSystem(world, dt);
  collisionSystem(world, BOUNDS);
  ballCollisionSystem(world);
  deformationSystem(world, dt);
}

function render() {
  renderSystem(world);
}

// Prefers the published cloud copy (the canonical one once a game has
// been published), falling back to a local file under public/scenes/ for
// scenes that only exist locally, falling back to an empty scene if
// neither exists yet (e.g. a brand-new game that hasn't been saved once).
async function loadSceneData(sceneId) {
  if (isCloudEnabled) {
    try {
      return await fetchPublishedScene(sceneId);
    } catch {
      // not published yet, or the fetch failed — fall through to local
    }
  }
  try {
    const res = await fetch(`./scenes/${sceneId}.json`);
    if (!res.ok) throw new Error(`No local scene file for "${sceneId}"`);
    return await res.json();
  } catch {
    return { version: 1, gravity: DEFAULT_GRAVITY, objects: [] };
  }
}

// Called once per mount from Stage's mount effect, always paired with a
// disposeEngine() call in that effect's cleanup — Stage can now
// unmount/remount as the user navigates between games, so this can no
// longer be a permanent one-shot latch. `stopLoop` still guards against
// StrictMode's double-invoke (or any other accidental double-call) within
// a single mount, since re-running this would fetch the scene twice and
// start a second physics loop.
export async function initEngine({ stageEl: stage, worldEl: worldGroup, gravityMarkerEl: marker, sceneId }) {
  if (stopLoop) return;
  stageEl = stage;
  worldEl = worldGroup;
  gravityMarkerEl = marker;

  const data = await loadSceneData(sceneId);
  gravity = loadScene(world, worldEl, data);
  clearSelectionInternal();
  updateGravityMarker();
  mode = "setup";
  status = statusText(mode);
  notify();

  stopLoop = startLoop({ update, render });
}

// Called from Stage's mount-effect cleanup when the user navigates away
// from a game (or switches to a different one). Stops the physics loop
// and resets every piece of module-level state initEngine() sets up, so
// the next initEngine() call for a different game starts from a clean
// slate instead of leaking a second concurrent rAF loop or a stale
// selection/gravity/file-handle from the previous game.
export function disposeEngine() {
  if (!stopLoop) return;
  stopLoop();
  stopLoop = null;
  clearSelectionInternal();
  clear(world);
  if (worldEl) clearChildren(worldEl);
  placingGravityPoint = false;
  fileHandle = null;
  gravity = DEFAULT_GRAVITY;
  mode = "setup";
  status = "";
  stageEl = null;
  worldEl = null;
  gravityMarkerEl = null;
  notify();
}
