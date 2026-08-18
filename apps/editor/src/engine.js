// The imperative "engine" bridge — owns the physics world, the SVG stage
// interactions, and the 60fps render loop, none of which belong in
// React's re-render model. Exposes a useSyncExternalStore-compatible
// store (subscribe/getSnapshot) for the UI-relevant slice of that state,
// plus action functions the React components call on user events.
import {
  createWorld,
  destroy,
  startLoop,
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
  serializeScene,
  loadScene,
  saveScene,
  openScene,
  spawnBall,
  randomBallColor,
} from "@bloobitygook/engine";
import { findBallAt, isGravityMarkerVisible, isPlaceGravityButtonEnabled, statusText } from "./ui-helpers.js";
import { publishScene, fetchPublishedScene } from "./publish.js";

const BOUNDS = { floorY: 560, left: 0, right: 800 };
const world = createWorld();

let gravity = { mode: "uniform", magnitude: 900, x: 400, y: 300 };
let mode = "setup"; // "setup" (frozen, editable) or "running" (physics live)
let selected = null;
let placingGravityPoint = false;
let fileHandle = null; // reused so repeat Saves overwrite in place, not re-prompt
let status = "Click the stage to drop a ball";

let stageEl = null;
let worldEl = null;
let gravityMarkerEl = null;
let initialized = false;

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

// Called once from Stage's mount effect. Guarded against StrictMode's
// double-invoke (and any other accidental double-call) since re-running
// this would fetch the default scene twice and start a second loop.
export async function initEngine({ stageEl: stage, worldEl: worldGroup, gravityMarkerEl: marker }) {
  if (initialized) return;
  initialized = true;
  stageEl = stage;
  worldEl = worldGroup;
  gravityMarkerEl = marker;

  const res = await fetch("./scenes/default.json");
  gravity = loadScene(world, worldEl, await res.json());
  clearSelectionInternal();
  updateGravityMarker();
  status = statusText(mode);
  notify();

  startLoop({ update, render });
}
