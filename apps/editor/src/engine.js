// The imperative "engine" bridge — owns the physics world, the SVG stage
// interactions, and the 60fps render loop, none of which belong in
// React's re-render model. Exposes a useSyncExternalStore-compatible
// store (subscribe/getSnapshot) for the UI-relevant slice of that state,
// plus action functions the React components call on user events.
import { createWorld, destroy, clear, clearChildren, startLoop } from "@bloobitygook/engine/core";
import {
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
  DEFAULT_GRAVITY,
  saveScene,
  openScene,
} from "@bloobitygook/engine/physics";
import {
  STANDARD_CATALOG,
  STANDARD_DEFINITIONS,
  createCatalog,
  catalogIdsOf,
  instantiateObject,
  serializeScene,
  loadScene,
  archetypeToDefinition,
} from "@bloobitygook/objects";
import { findEntityAt, isGravityMarkerVisible, isPlaceGravityButtonEnabled, statusText } from "./ui-helpers.js";
import { isCloudEnabled, publishScene, fetchPublishedScene } from "./publish.js";
import { fetchArchetype } from "./archetypes.js";

const BOUNDS = { floorY: 560, left: 0, right: 800 };
const world = createWorld();

let gravity = { mode: "uniform", magnitude: 900, x: 400, y: 300 };
let mode = "setup"; // "setup" (frozen, editable) or "running" (physics live)
let catalog = STANDARD_CATALOG.enabledIn(["ball"]); // replaced per-game in initEngine
let armedId = "ball"; // which catalog entry a stage click places next
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

function catalogEntrySnapshot(def) {
  return { id: def.id, label: def.label, swatch: def.swatch, category: def.category };
}

// Ball's fields stay exposed as before; a spawner exposes its own config
// fields instead. Anything else (a placed piece) exposes just enough for
// Inspector's minimal fallback branch (label + Delete).
function selectedSnapshot(entity) {
  const def = catalog.byId(entity.catalogId);
  // `definitionCategory` names which catalog category this entity's own
  // definition belongs to ("physics"/"piece"/"tool"); a spawner also has
  // its own `category` field (which OTHER category it spawns from) — kept
  // as separate names so Inspector can read/write `category` symmetrically
  // via updateSelectedProp without colliding with the definition's.
  const base = { catalogId: entity.catalogId, definitionCategory: def?.category ?? null, label: def?.label ?? entity.catalogId };
  if (entity.catalogId === "ball") {
    return { ...base, radius: entity.radius, color: entity.color, restitution: entity.restitution, friction: entity.friction };
  }
  if (base.definitionCategory === "tool") {
    return { ...base, x: entity.x, y: entity.y, category: entity.category, allowedTypes: entity.allowedTypes, strategy: entity.strategy };
  }
  return base;
}

function computeSnapshot() {
  return {
    mode,
    gravity,
    catalog: catalog.all().map(catalogEntrySnapshot),
    armedId,
    selected: selected ? selectedSnapshot(selected) : null,
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

// Ball outlines its circle; a spawner outlines its marker shape; anything
// else has no outline element and is silently skipped (harmless, and
// currently unreachable since findEntityAt only hit-tests radius-bearing
// entities — ball and spawner are the only two so far).
function outlineElOf(entity) {
  return entity.circleEl ?? entity.markerEl ?? null;
}

function selectEntityInternal(entity) {
  if (selected) outlineElOf(selected)?.removeAttribute("stroke");
  selected = entity;
  const outlineEl = outlineElOf(selected);
  outlineEl?.setAttribute("stroke", "#ffffff");
  outlineEl?.setAttribute("stroke-width", "3");
}

function clearSelectionInternal() {
  if (selected) outlineElOf(selected)?.removeAttribute("stroke");
  selected = null;
}

export function clearSelection() {
  clearSelectionInternal();
  notify();
}

export function setPaletteSelection(id) {
  if (!catalog.byId(id)) return;
  armedId = id;
  notify();
}

export function updateSelectedProp(key, value) {
  if (!selected) return;
  selected[key] = value;
  if (selected.catalogId === "ball" && (key === "radius" || key === "color")) syncBallVisual(selected);
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

  const hit = findEntityAt(world, x, y);
  if (hit) {
    selectEntityInternal(hit);
    notify();
    return;
  }

  const definition = catalog.byId(armedId);
  if (!definition) return;
  // Clamped for any pixel-space placement (not just ball) so nothing
  // lands visually below the fixed 800x600 stage's floor rect — a
  // stage-geometry constraint, not something object definitions need to
  // know about themselves.
  const spawnY = definition.coordinateSpace === "pixel" ? Math.min(y, BOUNDS.floorY - 20) : y;
  const def = definition.buildSpawnDef(x, spawnY, catalog);
  const entity = instantiateObject(catalog, armedId, world, worldEl, def);
  selectEntityInternal(entity);
  notify();
}

export async function saveSceneToFile() {
  try {
    fileHandle = await saveScene(serializeScene(world, gravity, catalog), { handle: fileHandle });
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
    await applyLoadedScene(data);
    status = "Scene loaded";
  } catch (err) {
    if (err.name !== "AbortError") status = `Open failed: ${err.message}`;
  }
  notify();
}

export async function publishCurrentScene(sceneId) {
  try {
    await publishScene(sceneId, serializeScene(world, gravity, catalog));
    status = `Published "${sceneId}"`;
  } catch (err) {
    status = `Publish failed: ${err.message}`;
  }
  notify();
}

export async function loadSceneFromCloud(sceneId) {
  try {
    const data = await fetchPublishedScene(sceneId);
    await applyLoadedScene(data);
    status = `Loaded "${sceneId}" from cloud`;
  } catch (err) {
    status = `Cloud load failed: ${err.message}`;
  }
  notify();
}

// Shared by every "load scene data into the live world" path (opening a
// local file, loading from cloud, or the initial initEngine load) — each
// one has to rebuild the catalog from the loaded file's own catalogIds,
// not just re-run loadScene against whatever catalog happened to be
// active before, since a loaded file can enable a different object set.
//
// An id the built-in STANDARD_CATALOG doesn't recognize is fetched as a
// user-authored archetype (see archetypes.js) and adapted into an
// ordinary definition — async, since that's a Storage round trip. A
// missing/offline archetype is simply left out rather than failing the
// whole load: loadScene's own "unknown type — skipped" warning already
// handles a scene referencing a type the active catalog doesn't have.
async function applyLoadedScene(data) {
  const ids = catalogIdsOf(data);
  const unknownIds = ids.filter((id) => !STANDARD_CATALOG.byId(id));
  const fetchedArchetypes =
    isCloudEnabled && unknownIds.length > 0 ? await Promise.all(unknownIds.map((id) => fetchArchetype(id))) : [];
  const archetypeDefinitions = fetchedArchetypes.filter(Boolean).map(archetypeToDefinition);

  catalog = createCatalog([...STANDARD_DEFINITIONS, ...archetypeDefinitions]).enabledIn(ids);
  armedId = catalog.all()[0]?.id ?? null;
  gravity = loadScene(world, worldEl, data, catalog);
  clearSelectionInternal();
  updateGravityMarker();
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
  await applyLoadedScene(data);
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
  catalog = STANDARD_CATALOG.enabledIn(["ball"]);
  armedId = "ball";
  mode = "setup";
  status = "";
  stageEl = null;
  worldEl = null;
  gravityMarkerEl = null;
  notify();
}
