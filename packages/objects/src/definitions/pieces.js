import { PIECE_TYPES, PIECE_COLORS, spawnPiece } from "@bloobitygook/tetris-pieces";

// `cellSize` here only quantizes clicks on the editor's fixed-size pixel
// canvas so a piece lands on a sensible grid while being authored — it has
// no bearing on whatever board size a game actually plays on once real
// gameplay wiring reads these placements later.
const EDITOR_CELL_SIZE = 24;

function quantizeToCell(x, y, cellSize) {
  return { col: Math.floor(x / cellSize), row: Math.floor(y / cellSize) };
}

function makePieceDefinition(type, cellSize) {
  return {
    id: type,
    category: "piece",
    label: type.toUpperCase(),
    swatch: PIECE_COLORS[type],
    coordinateSpace: "grid",
    cellSize,
    spawn(world, worldEl, def) {
      return spawnPiece(world, worldEl, type, { col: def.col, row: def.row }, cellSize);
    },
    // Rotation always comes back as 0 for now — nothing in this pass lets
    // a placed piece be rotated in the editor. Kept in the output anyway
    // so a future rotate-in-editor feature has a field to write into
    // without changing this shape again.
    serialize(entity) {
      return { col: entity.col, row: entity.row, pieceType: entity.pieceType, rotation: entity.rotation };
    },
    buildSpawnDef(x, y) {
      return quantizeToCell(x, y, cellSize);
    },
  };
}

export const pieceDefinitions = PIECE_TYPES.map((type) => makePieceDefinition(type, EDITOR_CELL_SIZE));

// Exported as default (an array, unlike the other definitions files) so
// packages/objects/src/standard.js can discover this file via
// import.meta.glob without a hand-maintained import list.
export default pieceDefinitions;
