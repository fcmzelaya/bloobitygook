import { describe, it, expect, vi } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine/core";
import { DEFAULT_GRAVITY } from "@bloobitygook/engine/physics";
import { createCatalog } from "../src/catalog.js";
import { STANDARD_CATALOG } from "../src/standard.js";
import { loadScene, serializeScene, catalogIdsOf, nextSceneIdOf } from "../src/scene.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

// A grid-shaped fake (col/row, no x/y at all) — the old hardcoded
// ["entityType","x","y"] query in engine's scene.js would have silently
// dropped this from serializeScene's output.
const gridDefinition = {
  id: "block",
  category: "piece",
  spawn: (world, worldEl, def) => spawn(world, { entityType: "cellGroup", col: def.col, row: def.row }),
  serialize: (entity) => ({ col: entity.col, row: entity.row }),
};

describe("loadScene / serializeScene gravity", () => {
  it("normalizes gravity through load and returns it", () => {
    const world = createWorld();
    const gravity = loadScene(world, makeWorldEl(), { objects: [], gravity: 900 }, STANDARD_CATALOG);
    expect(gravity).toEqual({ mode: "uniform", magnitude: 900, x: 400, y: 300 });
  });

  it("defaults to DEFAULT_GRAVITY when gravity is missing", () => {
    const world = createWorld();
    const gravity = loadScene(world, makeWorldEl(), { objects: [] }, STANDARD_CATALOG);
    expect(gravity).toEqual(DEFAULT_GRAVITY);
  });
});

describe("loadScene object spawning", () => {
  it("skips an unknown object type without throwing", () => {
    const world = createWorld();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      loadScene(world, makeWorldEl(), { objects: [{ type: "triangle", x: 0, y: 0 }] }, STANDARD_CATALOG)
    ).not.toThrow();
    expect(world.entities).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("clears prior entities before loading new ones", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    loadScene(world, worldEl, { objects: [{ type: "ball", x: 0, y: 0 }] }, STANDARD_CATALOG);
    expect(world.entities).toHaveLength(1);
    loadScene(world, worldEl, { objects: [] }, STANDARD_CATALOG);
    expect(world.entities).toHaveLength(0);
  });
});

describe("serializeScene", () => {
  it("round-trips a ball's fields through load -> serialize", () => {
    const world = createWorld();
    loadScene(
      world,
      makeWorldEl(),
      { objects: [{ type: "ball", x: 10.5, y: 20.25, radius: 16, color: "#fff", restitution: 0.5, friction: 0.1 }] },
      STANDARD_CATALOG
    );
    const out = serializeScene(world, DEFAULT_GRAVITY, STANDARD_CATALOG);
    expect(out.version).toBe(1);
    expect(out.objects[0]).toMatchObject({
      type: "ball",
      x: 10.5,
      y: 20.25,
      vx: 0,
      vy: 0,
      radius: 16,
      color: "#fff",
      restitution: 0.5,
      friction: 0.1,
    });
  });

  it("includes the catalog's own enabled ids in the saved file", () => {
    const world = createWorld();
    const narrowed = STANDARD_CATALOG.enabledIn(["ball", "o"]);
    const out = serializeScene(world, DEFAULT_GRAVITY, narrowed);
    expect(out.catalogIds).toEqual(["ball", "o"]);
  });

  it("does not drop a col/row-based (non-pixel) object from the saved file", () => {
    const catalog = createCatalog([gridDefinition]);
    const world = createWorld();
    loadScene(world, makeWorldEl(), { objects: [{ type: "block", col: 3, row: 4 }] }, catalog);
    const out = serializeScene(world, DEFAULT_GRAVITY, catalog);
    expect(out.objects).toEqual([{ type: "block", col: 3, row: 4 }]);
  });
});

describe("catalogIdsOf", () => {
  it("defaults to ball-only when absent, for scenes saved before catalogIds existed", () => {
    expect(catalogIdsOf({ objects: [] })).toEqual(["ball"]);
  });

  it("returns the scene's own catalogIds when present", () => {
    expect(catalogIdsOf({ objects: [], catalogIds: ["o", "j"] })).toEqual(["o", "j"]);
  });
});

describe("nextSceneId", () => {
  it("serializeScene defaults to null when not given", () => {
    const world = createWorld();
    const out = serializeScene(world, DEFAULT_GRAVITY, STANDARD_CATALOG);
    expect(out.nextSceneId).toBeNull();
  });

  it("serializeScene passes through a given nextSceneId", () => {
    const world = createWorld();
    const out = serializeScene(world, DEFAULT_GRAVITY, STANDARD_CATALOG, "level-2");
    expect(out.nextSceneId).toBe("level-2");
  });

  it("nextSceneIdOf reads it back, defaulting to null for a scene predating this field", () => {
    expect(nextSceneIdOf({ objects: [] })).toBeNull();
    expect(nextSceneIdOf({ objects: [], nextSceneId: "level-2" })).toBe("level-2");
  });
});
