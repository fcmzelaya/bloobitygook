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
