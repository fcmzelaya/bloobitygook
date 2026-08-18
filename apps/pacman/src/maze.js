// Hand-authored and hand-verified connected (no isolated pockets a pellet
// could get stranded in) — see docs/games-roadmap.md for the walkthrough.
// '#' wall, '.' pellet, 'o' power pellet. Row 4 has no boundary walls on
// purpose: it's the tunnel row, the only place col can legally go out of
// [0, COLS) — see isWallAt.
export const MAZE_ROWS = [
  "###########",
  "#o...#...o#",
  "#.##.#.##.#",
  "#.#.....#.#",
  "...........",
  "#.#.....#.#",
  "#.##.#.##.#",
  "#o...#...o#",
  "###########",
];

export const TUNNEL_ROW = 4;
export const ROWS = MAZE_ROWS.length;
export const COLS = MAZE_ROWS[0].length;

export function isWallAt(col, row) {
  if (row < 0 || row >= ROWS) return true;
  if (col < 0 || col >= COLS) return row !== TUNNEL_ROW; // open only through the tunnel
  return MAZE_ROWS[row][col] === "#";
}

// `skipCells` (a Set of "col,row" strings) lets the caller keep spawn
// points free of collectibles. Returns "power", "pellet", or null.
export function cellKindAt(col, row, skipCells) {
  if (isWallAt(col, row)) return null;
  if (skipCells?.has(`${col},${row}`)) return null;
  const ch = MAZE_ROWS[row]?.[col];
  if (ch === "o") return "power";
  if (ch === "." || ch === " ") return "pellet";
  return null;
}
