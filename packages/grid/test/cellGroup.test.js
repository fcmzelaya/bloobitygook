// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine";
import { spawnCellGroup, renderCellGroup, absoluteCells } from "../src/cellGroup.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

describe("spawnCellGroup", () => {
  it("creates one rect per cell and positions the group transform", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const cells = [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 0, row: 1 }];
    const entity = spawnCellGroup(world, worldEl, { col: 2, row: 3, cells, cellSize: 10, color: "#abc" });

    expect(entity.cellEls).toHaveLength(3);
    expect(worldEl.children).toHaveLength(1); // the wrapping <g>
    expect(entity.el.children).toHaveLength(3);
    expect(entity.el.getAttribute("transform")).toBe("translate(20 30)");
  });

  it("positions each cell rect by its relative offset", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const cells = [{ col: 0, row: 0 }, { col: 1, row: -1 }];
    const entity = spawnCellGroup(world, worldEl, { col: 0, row: 0, cells, cellSize: 10, color: "#abc" });

    expect(entity.cellEls[0].getAttribute("x")).toBe("1");
    expect(entity.cellEls[0].getAttribute("y")).toBe("1");
    expect(entity.cellEls[1].getAttribute("x")).toBe("11");
    expect(entity.cellEls[1].getAttribute("y")).toBe("-9");
  });
});

describe("renderCellGroup", () => {
  it("updates the DOM after col/row/cells mutate, without adding/removing nodes", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const cells = [{ col: 0, row: 0 }, { col: 1, row: 0 }];
    const entity = spawnCellGroup(world, worldEl, { col: 0, row: 0, cells, cellSize: 10, color: "#abc" });

    entity.col = 5;
    entity.cells = [{ col: 0, row: 0 }, { col: 0, row: 1 }]; // "rotated"
    renderCellGroup(entity);

    expect(entity.el.getAttribute("transform")).toBe("translate(50 0)");
    expect(entity.cellEls).toHaveLength(2); // same nodes reused
    expect(entity.cellEls[1].getAttribute("x")).toBe("1");
    expect(entity.cellEls[1].getAttribute("y")).toBe("11");
  });
});

describe("absoluteCells", () => {
  it("combines origin and relative offsets, and works on a plain candidate object", () => {
    const candidate = { col: 4, row: 2, cells: [{ col: -1, row: 0 }, { col: 0, row: 0 }] };
    expect(absoluteCells(candidate)).toEqual([
      { col: 3, row: 2 },
      { col: 4, row: 2 },
    ]);
  });
});
