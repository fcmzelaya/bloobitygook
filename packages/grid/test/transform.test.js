// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { spawnCellGroup } from "../src/cellGroup.js";
import { cellKey } from "../src/collision.js";
import { attemptTransform } from "../src/transform.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");
const bounds = { cols: 4, rows: 4 };

function makePiece(col, row) {
  const world = createWorld();
  const worldEl = makeWorldEl();
  return spawnCellGroup(world, worldEl, { col, row, cells: [{ col: 0, row: 0 }], cellSize: 10, color: "#abc" });
}

describe("attemptTransform", () => {
  it("applies a legal patch, mutating the piece and re-rendering it", () => {
    const piece = makePiece(1, 1);
    const result = attemptTransform(piece, { col: 2 }, new Set(), bounds);

    expect(result).toBe(true);
    expect(piece.col).toBe(2);
    expect(piece.el.getAttribute("transform")).toBe("translate(20 10)");
  });

  it("rejects an illegal patch, leaving the piece untouched", () => {
    const piece = makePiece(0, 0);
    const occupied = new Set([cellKey(1, 0)]);
    const result = attemptTransform(piece, { col: 1 }, occupied, bounds);

    expect(result).toBe(false);
    expect(piece.col).toBe(0);
    expect(piece.el.getAttribute("transform")).toBe("translate(0 0)");
  });

  it("rejects a patch that would go out of bounds", () => {
    const piece = makePiece(3, 0);
    expect(attemptTransform(piece, { col: 4 }, new Set(), bounds)).toBe(false);
  });

  it("accepts a custom collision strategy", () => {
    const piece = makePiece(0, 0);
    const alwaysBlocked = () => false;
    expect(attemptTransform(piece, { col: 1 }, new Set(), bounds, alwaysBlocked)).toBe(false);
  });
});
