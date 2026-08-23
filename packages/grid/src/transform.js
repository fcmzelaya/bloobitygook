import { canPlace } from "./collision.js";
import { absoluteCells, renderCellGroup } from "./cellGroup.js";

// The one shared "try to apply a change, roll back if it collides" helper
// — used identically for horizontal moves, rotation, and gravity/drop
// ticks, so none of them need to hand-duplicate "build a candidate, test
// collision, mutate-or-reject." `patch` is a partial update to apply to
// `piece` (e.g. {col: piece.col + 1}, or {rotation, cells} for a
// rotation). Strictly one attempt per call — no wall-kick/alternate-
// offset fallback; on rejection the piece is left untouched.
export function attemptTransform(piece, patch, occupied, bounds, strategy = canPlace) {
  const candidate = { ...piece, ...patch };
  if (!strategy(occupied, absoluteCells(candidate), bounds)) return false;
  Object.assign(piece, patch);
  renderCellGroup(piece);
  return true;
}
