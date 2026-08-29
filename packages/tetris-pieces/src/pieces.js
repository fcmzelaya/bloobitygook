import { spawnCellGroup } from "@bloobitygook/grid";
import pieceData from "./pieces.json";

// The rotation-offset table itself is external data (pieces.json, ported
// from the Python prototype valkirie/tetris/pieces.py) rather than a
// hardcoded source table — swapping to a different piece set, or adding
// one, is a data-file change, not a source edit. Each rotation state
// lists the 3 cells *besides* the implicit center cell (0,0);
// cellsForRotation() adds the center back in.
export const PIECES = pieceData.pieces;
export const PIECE_COLORS = pieceData.colors;

export const PIECE_TYPES = Object.keys(PIECES);

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
