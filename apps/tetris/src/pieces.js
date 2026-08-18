import { spawnCellGroup } from "@bloobitygook/grid";

// Rotation-offset table ported from the Python prototype
// (valkirie/tetris/pieces.py) — same 4-precomputed-rotation-states-per-
// piece idea, translated from pixel Vector offsets to grid {col,row}
// offsets. Each state lists the 3 cells *besides* the implicit center
// cell (0,0); cellsForRotation() adds the center back in.
const TOP_LEFT = { col: -1, row: -1 };
const TOP_CENTER = { col: 0, row: -1 };
const TOP_RIGHT = { col: 1, row: -1 };
const MIDDLE_LEFT = { col: -1, row: 0 };
const MIDDLE_RIGHT = { col: 1, row: 0 };
const BOTTOM_LEFT = { col: -1, row: 1 };
const BOTTOM_RIGHT = { col: 1, row: 1 };
const BOTTOM_CENTER = { col: 0, row: 1 };
const FAR_TOP = { col: 0, row: -2 };
const FAR_RIGHT = { col: 2, row: 0 };
const FAR_BOTTOM = { col: 0, row: 2 };
const FAR_LEFT = { col: -2, row: 0 };

export const PIECES = {
  o: [
    [TOP_LEFT, TOP_CENTER, MIDDLE_LEFT],
    [TOP_LEFT, TOP_CENTER, MIDDLE_LEFT],
    [TOP_LEFT, TOP_CENTER, MIDDLE_LEFT],
    [TOP_LEFT, TOP_CENTER, MIDDLE_LEFT],
  ],
  j: [
    [TOP_CENTER, BOTTOM_CENTER, BOTTOM_LEFT],
    [MIDDLE_RIGHT, MIDDLE_LEFT, TOP_LEFT],
    [BOTTOM_CENTER, TOP_CENTER, TOP_RIGHT],
    [MIDDLE_LEFT, MIDDLE_RIGHT, BOTTOM_RIGHT],
  ],
  l: [
    [TOP_CENTER, BOTTOM_CENTER, BOTTOM_RIGHT],
    [MIDDLE_RIGHT, MIDDLE_LEFT, BOTTOM_LEFT],
    [BOTTOM_CENTER, TOP_CENTER, TOP_LEFT],
    [MIDDLE_LEFT, MIDDLE_RIGHT, TOP_RIGHT],
  ],
  i: [
    [BOTTOM_CENTER, TOP_CENTER, FAR_BOTTOM],
    [MIDDLE_RIGHT, MIDDLE_LEFT, FAR_LEFT],
    [BOTTOM_CENTER, TOP_CENTER, FAR_TOP],
    [MIDDLE_LEFT, MIDDLE_RIGHT, FAR_RIGHT],
  ],
  t: [
    [MIDDLE_LEFT, TOP_CENTER, MIDDLE_RIGHT],
    [TOP_CENTER, MIDDLE_RIGHT, BOTTOM_CENTER],
    [MIDDLE_LEFT, BOTTOM_CENTER, MIDDLE_RIGHT],
    [BOTTOM_CENTER, TOP_CENTER, MIDDLE_LEFT],
  ],
  z: [
    [BOTTOM_CENTER, MIDDLE_RIGHT, TOP_RIGHT],
    [BOTTOM_CENTER, BOTTOM_RIGHT, MIDDLE_LEFT],
    [TOP_CENTER, MIDDLE_LEFT, BOTTOM_LEFT],
    [MIDDLE_RIGHT, TOP_CENTER, TOP_LEFT],
  ],
  s: [
    [MIDDLE_LEFT, TOP_CENTER, TOP_RIGHT],
    [TOP_CENTER, MIDDLE_RIGHT, BOTTOM_RIGHT],
    [MIDDLE_RIGHT, BOTTOM_CENTER, BOTTOM_LEFT],
    [BOTTOM_CENTER, MIDDLE_LEFT, TOP_LEFT],
  ],
};

export const PIECE_COLORS = {
  o: "#f4d03f",
  j: "#5dade2",
  l: "#eb984e",
  i: "#48c9b0",
  t: "#af7ac5",
  z: "#ec7063",
  s: "#58d68d",
};

export const PIECE_TYPES = Object.keys(PIECES);

export function randomPieceType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

export function cellsForRotation(type, rotation) {
  return [{ col: 0, row: 0 }, ...PIECES[type][rotation]];
}

export function spawnPiece(world, worldEl, type, origin, cellSize) {
  const entity = spawnCellGroup(world, worldEl, {
    col: origin.col,
    row: origin.row,
    cells: cellsForRotation(type, 0),
    cellSize,
    color: PIECE_COLORS[type],
  });
  entity.pieceType = type;
  entity.rotation = 0;
  return entity;
}
