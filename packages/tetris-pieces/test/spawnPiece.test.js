// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { spawnPiece } from "../src/pieces.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

describe("spawnPiece", () => {
  it("spawns at rotation 0, stamped with its piece type, at the given origin", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const entity = spawnPiece(world, worldEl, "t", { col: 4, row: -1 }, 24);

    expect(entity.pieceType).toBe("t");
    expect(entity.rotation).toBe(0);
    expect(entity.col).toBe(4);
    expect(entity.row).toBe(-1);
    expect(entity.cellEls).toHaveLength(4);
  });
});
