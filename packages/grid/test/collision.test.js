import { describe, it, expect } from "vitest";
import { cellKey, canPlace, checkCompleteRows, rowAfterClear, occupiedAfterClear } from "../src/collision.js";

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

describe("rowAfterClear", () => {
  it("leaves a row below every cleared row unchanged", () => {
    expect(rowAfterClear(15, [12])).toBe(15);
  });

  it("shifts a row above a single cleared row down by one", () => {
    expect(rowAfterClear(10, [12])).toBe(11);
  });

  it("shifts by the count of cleared rows below it", () => {
    expect(rowAfterClear(3, [5, 10])).toBe(5);
    expect(rowAfterClear(7, [5, 10])).toBe(8);
  });
});

describe("occupiedAfterClear", () => {
  it("drops cells in cleared rows and shifts everything above down", () => {
    const occupied = new Set([cellKey(0, 5), cellKey(0, 9), cellKey(1, 12)]);
    const result = occupiedAfterClear(occupied, [9]);
    expect(result).toEqual(new Set([cellKey(0, 6), cellKey(1, 12)]));
  });

  // Regression test for a real bug: two vertically stacked occupied cells
  // in the same column, both shifting down by the same amount after a
  // clear, so the lower cell's *new* key equals the upper cell's
  // *current* key. An in-place delete-then-add per cell (the original
  // implementation) let processing order determine whether the upper
  // cell's key survived — a later cell's "delete my old key" step could
  // wipe out an earlier cell's freshly-added key, since both were just
  // the same string in one shared Set. This produced a real, reproduced
  // in-game symptom: a visually complete row that never cleared, because
  // occupiedAfterClear's caller (apps/tetris's clearRows) thought one of
  // its cells was empty. occupiedAfterClear must be order-independent —
  // built as a fresh Set from the original, not mutated cell-by-cell.
  it("keeps every surviving cell when a chain of cells in one column all shift", () => {
    // Column 9 has cells at rows 10 and 11; row 12 clears, so 10 -> 11
    // and 11 -> 12 -- the first cell's destination is the second cell's
    // current position.
    const occupied = new Set([cellKey(9, 10), cellKey(9, 11), cellKey(9, 12)]);
    const result = occupiedAfterClear(occupied, [12]);
    expect(result).toEqual(new Set([cellKey(9, 11), cellKey(9, 12)]));
  });

  it("is order-independent regardless of Set insertion order", () => {
    const forward = occupiedAfterClear(new Set([cellKey(2, 4), cellKey(2, 5), cellKey(2, 6)]), [7]);
    const backward = occupiedAfterClear(new Set([cellKey(2, 6), cellKey(2, 5), cellKey(2, 4)]), [7]);
    expect(forward).toEqual(backward);
    expect(forward).toEqual(new Set([cellKey(2, 5), cellKey(2, 6), cellKey(2, 7)]));
  });
});
