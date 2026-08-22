import { query } from "@bloobitygook/engine/core";

// Hit-tested by distance-to-center; later-spawned (visually on top) balls
// win on overlap since query() returns entities in spawn order.
export function findBallAt(world, x, y) {
  const balls = query(world, ["radius", "x", "y"]);
  for (let i = balls.length - 1; i >= 0; i--) {
    const e = balls[i];
    if (Math.hypot(e.x - x, e.y - y) <= e.radius) return e;
  }
  return null;
}

export function isGravityMarkerVisible(gravity) {
  return gravity.mode === "point";
}

export function isPlaceGravityButtonEnabled(mode, gravity) {
  return mode === "setup" && gravity.mode === "point";
}

export function statusText(mode) {
  return mode === "setup"
    ? "Setup — click the stage to place a ball, or click a ball to edit it"
    : "Running — physics active";
}
