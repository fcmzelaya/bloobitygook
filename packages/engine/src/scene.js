import { clear, query } from "./world.js";
import { clearChildren } from "./svg.js";
import { spawnBall } from "./objects/ball.js";

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
  return normalizeGravity(sceneData.gravity);
}

export const DEFAULT_GRAVITY = { mode: "uniform", magnitude: 900, x: 400, y: 300 };

// Accepts the pre-point-gravity file format (a bare number) alongside the
// current { mode, magnitude, x, y } shape, so older saved scenes still load.
function normalizeGravity(raw) {
  if (raw == null) return { ...DEFAULT_GRAVITY };
  if (typeof raw === "number") return { ...DEFAULT_GRAVITY, magnitude: raw };
  return { ...DEFAULT_GRAVITY, ...raw };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
