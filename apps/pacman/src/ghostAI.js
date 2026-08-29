import { DIRECTIONS } from "./movement.js";

const REVERSE = { up: "down", down: "up", left: "right", right: "left" };

// Which targeting mode a ghost uses is a name-keyed registry, not an
// inline branch — mirrors packages/grid's PICK_STRATEGIES/collisionStrategies
// pattern so a future third mode (e.g. a per-ghost personality) is a new
// entry here, not a rewritten conditional.
const TARGETING_STRATEGIES = {
  closest: (dist, bestDist) => dist < bestDist,
  farthest: (dist, bestDist) => dist > bestDist,
};

// Picks the best open neighboring direction by straight-line distance to
// `target` ({col, row}). `preference` "closest" is chase/scatter (both
// are just "seek this target," they only differ in what the target is);
// "farthest" is flee. Won't reverse direction unless that's the only
// open option (a dead end) — reversing whenever convenient reads as
// jittery, not as a pursuit.
export function chooseDirection(col, row, currentDirection, target, isBlocked, preference = "closest") {
  const isBetter = TARGETING_STRATEGIES[preference];
  if (!isBetter) throw new Error(`Unknown targeting preference "${preference}"`);

  const open = (dir) => {
    const { dx, dy } = DIRECTIONS[dir];
    return !isBlocked(col + dx, row + dy);
  };

  const nonReversing = Object.keys(DIRECTIONS).filter(
    (dir) => dir !== REVERSE[currentDirection] && open(dir)
  );
  const candidates = nonReversing.length > 0 ? nonReversing : Object.keys(DIRECTIONS).filter(open);

  if (candidates.length === 0) return currentDirection; // fully boxed in — shouldn't happen in a connected maze

  const distanceFor = (dir) => {
    const { dx, dy } = DIRECTIONS[dir];
    return Math.hypot(col + dx - target.col, row + dy - target.row);
  };

  let best = candidates[0];
  let bestDist = distanceFor(best);
  for (const dir of candidates.slice(1)) {
    const dist = distanceFor(dir);
    if (isBetter(dist, bestDist)) {
      best = dir;
      bestDist = dist;
    }
  }
  return best;
}
