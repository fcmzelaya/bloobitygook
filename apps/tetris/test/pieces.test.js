import { describe, it, expect } from "vitest";
import { PIECES, PIECE_TYPES, cellsForRotation, randomPieceType } from "../src/pieces.js";

describe("PIECES rotation table", () => {
  it("every piece has exactly 4 rotation states", () => {
    for (const type of PIECE_TYPES) {
      expect(PIECES[type]).toHaveLength(4);
    }
  });

  it("every rotation state produces exactly 4 cells total (center + 3 offsets)", () => {
    for (const type of PIECE_TYPES) {
      for (let rotation = 0; rotation < 4; rotation++) {
        expect(cellsForRotation(type, rotation)).toHaveLength(4);
      }
    }
  });

  it("every rotation state's cells are unique (no overlapping cells within one piece)", () => {
    for (const type of PIECE_TYPES) {
      for (let rotation = 0; rotation < 4; rotation++) {
        const keys = cellsForRotation(type, rotation).map((c) => `${c.col},${c.row}`);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it("the O piece forms a 2x2 square in every rotation (rotation-invariant)", () => {
    for (let rotation = 0; rotation < 4; rotation++) {
      const cells = cellsForRotation("o", rotation);
      const keys = new Set(cells.map((c) => `${c.col},${c.row}`));
      expect(keys).toEqual(new Set(["-1,-1", "0,-1", "-1,0", "0,0"]));
    }
  });

  it("the I piece is 4 cells in a straight line, alternating horizontal/vertical each rotation", () => {
    const rot0 = cellsForRotation("i", 0);
    const rot1 = cellsForRotation("i", 1);
    expect(new Set(rot0.map((c) => c.col)).size).toBe(1); // vertical: same column
    expect(new Set(rot1.map((c) => c.row)).size).toBe(1); // horizontal: same row
  });
});

describe("randomPieceType", () => {
  it("always returns a valid piece type", () => {
    for (let i = 0; i < 20; i++) {
      expect(PIECE_TYPES).toContain(randomPieceType());
    }
  });
});
