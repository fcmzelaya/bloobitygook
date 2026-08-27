import { query } from "@bloobitygook/engine/core";

// Generalized from the old ball-only findBallAt: any entity with a
// pixel-space x/y/radius (ball, or the spawner marker) hit-tests the same
// way — distance-to-center. A grid-based entity (a placed Tetris piece)
// has no radius at all, so it's simply excluded from this query rather
// than needing its own bounding-box hit-test, since nothing yet lets a
// placed piece be reselected after placement.
export function findEntityAt(world, x, y) {
  const candidates = query(world, ["radius", "x", "y"]);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const e = candidates[i];
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
    ? "Setup — click the stage to place the selected object, or click one to edit it"
    : "Running — physics active";
}
