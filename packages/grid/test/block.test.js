// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { spawnBlock, moveBlockRow } from "../src/block.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

describe("spawnBlock", () => {
  it("positions the rect from col/row/cellSize", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const block = spawnBlock(world, worldEl, { col: 2, row: 3, cellSize: 10, color: "#f00" });

    expect(block.el.getAttribute("x")).toBe("21");
    expect(block.el.getAttribute("y")).toBe("31");
    expect(worldEl.children).toHaveLength(1);
  });
});

describe("moveBlockRow", () => {
  it("updates both the entity's row and the rendered y position", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const block = spawnBlock(world, worldEl, { col: 0, row: 0, cellSize: 10, color: "#f00" });

    moveBlockRow(block, 5);

    expect(block.row).toBe(5);
    expect(block.el.getAttribute("y")).toBe("51");
  });
});
