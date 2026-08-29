import { createWorld, startLoop } from "@bloobitygook/engine/core";
import { gravitySystem, integrateSystem, collisionSystem, deformationSystem, renderSystem } from "@bloobitygook/engine/physics";
import { animationSystem } from "@bloobitygook/animation";
import { STANDARD_CATALOG, instantiateObject } from "@bloobitygook/objects";
import { applyMoveInput, applyJump } from "@bloobitygook/platformer";
import config from "./config.json";

// Proof-of-concept for the character system (physics + animation + open
// stat bag) — one hand-placed blob, no stage/platforms/goals yet, that's
// deliberately deferred to a later phase. Not part of the composed site
// (no bloobitygook.route in package.json).
const catalog = STANDARD_CATALOG.enabledIn(["blob"]);
const world = createWorld();
const worldEl = document.getElementById("world");

const character = instantiateObject(catalog, "blob", world, worldEl, config.spawnDef);

const held = new Set();
let direction = 0;

function updateDirection() {
  const left = held.has("ArrowLeft");
  const right = held.has("ArrowRight");
  direction = left === right ? 0 : left ? -1 : 1;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    held.add(e.key);
    updateDirection();
    e.preventDefault();
  } else if (e.key === " " && !e.repeat) {
    applyJump(character, character.stats.jumpImpulse);
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    held.delete(e.key);
    updateDirection();
  }
});

function update(dt) {
  applyMoveInput(character, direction, character.stats.moveSpeed);
  gravitySystem(world, dt, config.gravity);
  integrateSystem(world, dt);
  collisionSystem(world, config.bounds);
  deformationSystem(world, dt);
  animationSystem(world, dt);
}

function render() {
  renderSystem(world);
}

startLoop({ update, render });
