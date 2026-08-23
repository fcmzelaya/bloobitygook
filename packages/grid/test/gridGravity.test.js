// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { spawnCellGroup } from "../src/cellGroup.js";
import { cellKey } from "../src/collision.js";
import { applyGridGravity } from "../src/gridGravity.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");
const bounds = { cols: 4, rows: 4 };

function makePiece(col, row) {
  const world = createWorld();
  const worldEl = makeWorldEl();
  return spawnCellGroup(world, worldEl, { col, row, cells: [{ col: 0, row: 0 }], cellSize: 10, color: "#abc" });
}

describe("applyGridGravity", () => {
  it("steps the entity by the given direction when unblocked", () => {
    const piece = makePiece(0, 0);
    const result = applyGridGravity(piece, { dcol: 0, drow: 1 }, new Set(), bounds);
    expect(result).toBe(true);
    expect(piece.row).toBe(1);
  });

  it("supports a non-downward direction — nothing here is Tetris-specific", () => {
    const piece = makePiece(0, 0);
    applyGridGravity(piece, { dcol: 1, drow: 0 }, new Set(), bounds);
    expect(piece.col).toBe(1);
    expect(piece.row).toBe(0);
  });

  it("returns false and leaves the entity in place when blocked", () => {
    const piece = makePiece(0, 3);
    const result = applyGridGravity(piece, { dcol: 0, drow: 1 }, new Set(), bounds);
    expect(result).toBe(false);
    expect(piece.row).toBe(3);
  });

  it("returns false when the target cell is occupied", () => {
    const piece = makePiece(0, 0);
    const occupied = new Set([cellKey(0, 1)]);
    expect(applyGridGravity(piece, { dcol: 0, drow: 1 }, occupied, bounds)).toBe(false);
  });
});
