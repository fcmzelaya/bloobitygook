// Pure, framework-agnostic — no ECS/world dependency, so this is trivial
// to unit test and reusable by any grid-based game (Tetris today, a
// maze-walled game later), not just the falling-piece case.

export function cellKey(col, row) {
  return `${col},${row}`;
}

// `occupied` is a Set of cellKey() strings. `cells` is a list of
// {col, row} absolute board positions to test. `row < 0` is allowed —
// pieces spawn above the visible board, matching standard Tetris.
export function canPlace(occupied, cells, bounds) {
  for (const { col, row } of cells) {
    if (col < 0 || col >= bounds.cols || row >= bounds.rows) return false;
    if (occupied.has(cellKey(col, row))) return false;
  }
  return true;
}

// Returns the row indices (top-to-bottom order) that are completely filled.
export function checkCompleteRows(occupied, bounds) {
  const complete = [];
  for (let row = 0; row < bounds.rows; row++) {
    let full = true;
    for (let col = 0; col < bounds.cols; col++) {
      if (!occupied.has(cellKey(col, row))) {
        full = false;
        break;
      }
    }
    if (full) complete.push(row);
  }
  return complete;
}

// Which row a surviving cell lands on after `clearedRows` are removed and
// everything above them falls to fill the gap — every row below all of
// `clearedRows` is unaffected (shift 0); a row with N cleared rows below
// it shifts down by N.
export function rowAfterClear(row, clearedRows) {
  return row + clearedRows.filter((r) => r > row).length;
}

// Rebuilds `occupied` from scratch as it should look after clearing
// `clearedRows`, given `bounds`. Builds a brand-new Set from the current
// one in a single pass rather than deleting/adding into the existing Set
// per cell — an in-place delete-then-add per cell is order-dependent
// (this is the shape of a real bug: two vertically stacked occupied
// cells in the same column, both shifting down by the same amount, means
// the lower cell's *new* key equals the upper cell's *current* key —
// processed as delete/add per-cell, the upper cell's later delete can
// wipe out the key the lower cell just added, since both are just the
// same string in one shared Set). Building a new Set sidesteps the
// ordering question entirely: every entry is computed once, purely, from
// the untouched original Set.
export function occupiedAfterClear(occupied, clearedRows) {
  const clearedSet = new Set(clearedRows);
  const next = new Set();
  for (const key of occupied) {
    const [col, row] = key.split(",").map(Number);
    if (clearedSet.has(row)) continue;
    next.add(cellKey(col, rowAfterClear(row, clearedRows)));
  }
  return next;
}
