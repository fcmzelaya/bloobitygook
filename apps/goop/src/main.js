import { createWorld, startLoop } from "@bloobitygook/engine/core";
import { gravitySystem, integrateSystem, collisionSystem, deformationSystem, renderSystem } from "@bloobitygook/engine/physics";
import { animationSystem } from "@bloobitygook/animation";
import { behaviorSystem } from "@bloobitygook/behavior";
import { createCatalog, archetypeToDefinition, instantiateObject } from "@bloobitygook/objects";
import { createKeyboardController } from "@bloobitygook/platformer";
import config from "./config.json";

// End-to-end proof of the no-code archetype system: every entity here is
// spawned from a plain data record (config.json's `archetypes`), not a
// hand-written spawn function — one input-driven ("goblin", keyboard) and
// one scripted ("patroller", the "patrol" preset). This is what the
// editor's Archetypes UI produces when signed in; this app just spawns
// the same shape of record directly, since it isn't published anywhere
// yet (no bloobitygook.route — a capability proof, not a game).
const world = createWorld();
const worldEl = document.getElementById("world");

const catalog = createCatalog(config.archetypes.map(archetypeToDefinition));

let playerController = null;
for (const { archetypeId, x, y } of config.spawns) {
  const entity = instantiateObject(catalog, archetypeId, world, worldEl, { x, y, stats: {} });
  if (entity.player) playerController = createKeyboardController(entity);
}

window.addEventListener("keydown", (e) => {
  if (!playerController) return;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ") e.preventDefault();
  playerController.handleKeyDown(e.key);
});

window.addEventListener("keyup", (e) => {
  if (!playerController) return;
  playerController.handleKeyUp(e.key);
});

function update(dt) {
  gravitySystem(world, dt, config.gravity);
  behaviorSystem(world, dt); // drives the patroller's "patrol" state machine
  integrateSystem(world, dt);
  collisionSystem(world, config.bounds);
  deformationSystem(world, dt);
  animationSystem(world, dt);
}

function render() {
  renderSystem(world);
}

startLoop({ update, render });
