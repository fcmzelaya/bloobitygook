import { clear, query } from "./world.js";
import { clearChildren } from "./svg.js";
import { spawnBall } from "../game/ball.js";

// One place mapping a scene object's "type" field to the function that
// knows how to spawn it. Adding a new object type means adding one entry
// here and a new spawnX() in game/, not touching load/save at all.
const SPAWNERS = {
  ball: spawnBall,
};

export function serializeScene(world, gravity) {
  const objects = query(world, ["entityType", "x", "y"]).map((e) => ({
    type: e.entityType,
    x: round(e.x),
    y: round(e.y),
    vx: round(e.vx ?? 0),
    vy: round(e.vy ?? 0),
    radius: e.radius,
    color: e.color,
    restitution: e.restitution,
    friction: e.friction,
  }));
  return { version: 1, gravity, objects };
}

export function loadScene(world, worldEl, sceneData) {
  clear(world);
  clearChildren(worldEl);
  for (const def of sceneData.objects ?? []) {
    const spawnFn = SPAWNERS[def.type];
    if (!spawnFn) {
      console.warn(`Unknown object type "${def.type}" in scene file — skipped.`);
      continue;
    }
    spawnFn(world, worldEl, def);
  }
  return sceneData.gravity ?? 900;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
