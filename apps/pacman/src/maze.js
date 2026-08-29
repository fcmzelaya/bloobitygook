// Mazes ship baked into the build (no runtime fetch) — drop a new JSON
// file in ../mazes/ and it's available automatically, no import list to
// maintain (mirrors apps/play/src/scenes.js's exact pattern). Each maze
// is hand-authored and hand-verified connected (no isolated pockets a
// pellet could get stranded in) — see docs/games-roadmap.md for the
// walkthrough. '#' wall, '.' pellet, 'o' power pellet. `tunnelRow` is the
// one row with no boundary walls on purpose: the only place col can
// legally go outside [0, COLS) — see isWallAt.
const modules = import.meta.glob("../mazes/*.json", { eager: true });

export const mazes = Object.entries(modules).map(([path, mod]) => ({
  id: path.split("/").pop().replace(".json", ""),
  data: mod.default,
}));

const activeMaze = mazes[0].data;

export const MAZE_ROWS = activeMaze.rows;
export const TUNNEL_ROW = activeMaze.tunnelRow;
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
