import { createWorld, startLoop, hierarchySystem, query } from "@bloobitygook/engine/core";
import {
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
  DEFAULT_GRAVITY,
} from "@bloobitygook/engine/physics";
import { behaviorSystem } from "@bloobitygook/behavior";
import { animationSystem } from "@bloobitygook/animation";
import { platformCarrySystem, createKeyboardController } from "@bloobitygook/platformer";
import { loadSceneWithArchetypes, nextSceneIdOf } from "@bloobitygook/objects";
import { createTrigger, runTriggers, createZone, zoneEntryCondition } from "@bloobitygook/triggers";
import { fetchScene, fetchArchetype } from "./scene-storage.js";

// Same fixed 800x600 stage / floor bounds every scene is authored against
// in apps/editor's canvas (its Stage.jsx / engine.js's BOUNDS) — a scene
// plays back identically to how it looked while being built.
const BOUNDS = { floorY: 560, left: 0, right: 800 };
const world = createWorld();
const worldEl = document.getElementById("world");
const statusEl = document.getElementById("status");

let gravity = DEFAULT_GRAVITY;
let playerController = null;
let goalTriggers = [];
let nextSceneId = null;
let finished = true; // paused until the first scene actually loads

// Any placed entity whose own definition is category "goal" becomes a
// zone-entry trigger — packages/triggers' first real "reaching a goal"
// use case, the same way line-clear/portals validated it earlier. Width/
// height come from the archetype's own stats (packages/objects' generic
// property system), editable for free in the editor's Inspector.
function buildGoalTriggers(catalog) {
  return query(world, ["stats", "catalogId"])
    .filter((e) => catalog.byId(e.catalogId)?.category === "goal")
    .map((goalEntity) => {
      const width = goalEntity.stats.width ?? 40;
      const height = goalEntity.stats.height ?? 40;
      const zone = createZone(goalEntity.x - width / 2, goalEntity.y - height / 2, width, height);
      return createTrigger({
        condition: zoneEntryCondition(zone, (w) => query(w, ["player"])),
        action: () => onGoalReached(),
      });
    });
}

// Advances to this scene's own nextSceneId (updating the URL so
// reload/sharing still points at the right level) or shows a terminal
// "You win!" state when there isn't one — a valid, expected end, not an
// error.
async function onGoalReached() {
  if (finished) return;
  finished = true;
  if (nextSceneId) {
    const params = new URLSearchParams(window.location.search);
    params.set("scene", nextSceneId);
    window.history.replaceState(null, "", `?${params}`);
    await loadAndStart(nextSceneId);
  } else {
    statusEl.textContent = "You win!";
  }
}

async function loadAndStart(sceneId) {
  finished = true; // pause simulation while the fetch/spawn is in flight
  playerController = null;
  statusEl.textContent = `Loading "${sceneId}"…`;
  try {
    const sceneData = await fetchScene(sceneId);
    const { gravity: loadedGravity, catalog } = await loadSceneWithArchetypes({
      sceneData,
      world,
      worldEl,
      fetchArchetype,
    });
    gravity = loadedGravity;
    nextSceneId = nextSceneIdOf(sceneData);
    goalTriggers = buildGoalTriggers(catalog);

    const player = query(world, ["player"])[0];
    if (player) playerController = createKeyboardController(player);

    statusEl.textContent = "";
    finished = false;
  } catch (err) {
    statusEl.textContent = `Failed to load "${sceneId}": ${err.message}`;
  }
}

window.addEventListener("keydown", (e) => {
  if (!playerController) return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ") e.preventDefault();
  playerController.handleKeyDown(e.key);
});

window.addEventListener("keyup", (e) => {
  playerController?.handleKeyUp(e.key);
});

// Tick order matches apps/editor's Run mode exactly (see its engine.js)
// so a scene behaves the same whether it's being tested in the editor or
// actually played.
function update(dt) {
  if (finished) return;
  gravitySystem(world, dt, gravity);
  behaviorSystem(world, dt);
  integrateSystem(world, dt);
  collisionSystem(world, BOUNDS);
  platformCarrySystem(world);
  ballCollisionSystem(world);
  deformationSystem(world, dt);
  animationSystem(world, dt);
  runTriggers(world, goalTriggers);
}

function render() {
  hierarchySystem(world);
  renderSystem(world);
}

const initialSceneId = new URLSearchParams(window.location.search).get("scene");
if (!initialSceneId) {
  statusEl.textContent = "No scene specified — add ?scene=<id> to the URL.";
} else {
  loadAndStart(initialSceneId);
}

startLoop({ update, render });
