import { canPlace } from "./collision.js";
import { attemptTransform } from "./transform.js";

// The discrete, direction-configurable counterpart to packages/engine's
// continuous physics gravitySystem — not a unification of the two
// (continuous-velocity integration and discrete per-tick grid stepping
// are different computations), just the same "configurable pull" idea
// expressed at the grid layer. `direction` is a {dcol, drow} step vector
// — {dcol:0, drow:1} is "down" for Tetris, but nothing here assumes that;
// a different stage can configure any direction.
export function applyGridGravity(entity, direction, occupied, bounds, strategy = canPlace) {
  return attemptTransform(
    entity,
    { col: entity.col + direction.dcol, row: entity.row + direction.drow },
    occupied,
    bounds,
    strategy
  );
}
