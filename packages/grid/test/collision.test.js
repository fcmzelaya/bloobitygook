import { describe, it, expect } from "vitest";
import { cellKey, canPlace, checkCompleteRows } from "../src/collision.js";

const bounds = { cols: 4, rows: 4 };

describe("canPlace", () => {
  it("allows cells within bounds and unoccupied", () => {
    const occupied = new Set();
    expect(canPlace(occupied, [{ col: 0, row: 0 }, { col: 3, row: 3 }], bounds)).toBe(true);
  });

  it("rejects a cell outside the horizontal bounds", () => {
    const occupied = new Set();
    expect(canPlace(occupied, [{ col: -1, row: 0 }], bounds)).toBe(false);
    expect(canPlace(occupied, [{ col: 4, row: 0 }], bounds)).toBe(false);
  });

  it("rejects a cell below the board but allows above it", () => {
    const occupied = new Set();
    expect(canPlace(occupied, [{ col: 0, row: 4 }], bounds)).toBe(false);
    expect(canPlace(occupied, [{ col: 0, row: -1 }], bounds)).toBe(true);
  });

  it("rejects a cell already occupied", () => {
    const occupied = new Set([cellKey(2, 2)]);
    expect(canPlace(occupied, [{ col: 2, row: 2 }], bounds)).toBe(false);
  });
});

describe("checkCompleteRows", () => {
  it("finds no complete rows on an empty board", () => {
    expect(checkCompleteRows(new Set(), bounds)).toEqual([]);
  });

  it("finds a single fully-occupied row", () => {
    const occupied = new Set([0, 1, 2, 3].map((col) => cellKey(col, 2)));
    expect(checkCompleteRows(occupied, bounds)).toEqual([2]);
  });

  it("ignores a row missing one cell", () => {
    const occupied = new Set([0, 1, 2].map((col) => cellKey(col, 2))); // missing col 3
    expect(checkCompleteRows(occupied, bounds)).toEqual([]);
  });

  it("finds multiple complete rows in top-to-bottom order", () => {
    const occupied = new Set();
    for (const row of [3, 0]) {
      for (let col = 0; col < bounds.cols; col++) occupied.add(cellKey(col, row));
    }
    expect(checkCompleteRows(occupied, bounds)).toEqual([0, 3]);
  });
});
