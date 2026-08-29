import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { PIECE_TYPES } from "@bloobitygook/tetris-pieces";
import { STANDARD_CATALOG } from "../src/standard.js";
import { instantiateObject, serializeObject } from "../src/instantiate.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

describe("STANDARD_CATALOG", () => {
  it("has one definition per piece type, plus ball, blob, and spawner", () => {
    const ids = STANDARD_CATALOG.all().map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["ball", "blob", "spawner", ...PIECE_TYPES]));
    expect(ids).toHaveLength(PIECE_TYPES.length + 3);
  });

  it("ball spawns and serializes through the shared wrapper", () => {
    const world = createWorld();
    const entity = instantiateObject(STANDARD_CATALOG, "ball", world, makeWorldEl(), {
      x: 10,
      y: 20,
      radius: 16,
      color: "#fff",
      restitution: 0.5,
      friction: 0.1,
    });
    expect(entity.catalogId).toBe("ball");
    expect(serializeObject(STANDARD_CATALOG, entity)).toEqual({
      type: "ball",
      x: 10,
      y: 20,
      vx: 0,
      vy: 0,
      radius: 16,
      color: "#fff",
      restitution: 0.5,
      friction: 0.1,
    });
  });

  it("blob character spawns with physics + animation + stats, and serializes them all", () => {
    const world = createWorld();
    const def = {
      x: 50,
      y: 60,
      radius: 18,
      color: "#7ee08a",
      restitution: 0.4,
      friction: 0.2,
      animations: { idle: { frames: [{ r: 18 }, { r: 15 }], fps: 3 } },
      animation: "idle",
      stats: { moveSpeed: 220, jumpImpulse: 480, health: 3 },
    };
    const entity = instantiateObject(STANDARD_CATALOG, "blob", world, makeWorldEl(), def);

    expect(entity.catalogId).toBe("blob");
    expect(entity.entityType).toBe("character");
    expect(entity.grounded).toBeUndefined(); // set by packages/engine's collisionSystem, not at spawn time
    expect(entity.stats).toEqual({ moveSpeed: 220, jumpImpulse: 480, health: 3 });
    expect(entity.animation.frames).toEqual(def.animations.idle.frames);
    expect(entity.animation.fps).toBe(3);

    expect(serializeObject(STANDARD_CATALOG, entity)).toEqual({
      type: "blob",
      x: 50,
      y: 60,
      vx: 0,
      vy: 0,
      radius: 18,
      color: "#7ee08a",
      restitution: 0.4,
      friction: 0.2,
      animations: def.animations,
      animation: "idle",
      stats: { moveSpeed: 220, jumpImpulse: 480, health: 3 },
    });
  });

  it("blob throws when spawned with an unknown active animation name", () => {
    const world = createWorld();
    expect(() =>
      instantiateObject(STANDARD_CATALOG, "blob", world, makeWorldEl(), {
        x: 0,
        y: 0,
        animations: { idle: { frames: [{}], fps: 1 } },
        animation: "walk",
      })
    ).toThrow(/Unknown animation/);
  });

  it.each(PIECE_TYPES)("%s piece spawns and serializes with its own catalogId", (type) => {
    const world = createWorld();
    const entity = instantiateObject(STANDARD_CATALOG, type, world, makeWorldEl(), { col: 2, row: 3 });
    expect(entity.entityType).toBe("cellGroup");
    expect(entity.catalogId).toBe(type);
    expect(serializeObject(STANDARD_CATALOG, entity)).toEqual({
      type,
      col: 2,
      row: 3,
      pieceType: type,
      rotation: 0,
    });
  });

  it("piece buildSpawnDef quantizes a pixel click to its cell", () => {
    const definition = STANDARD_CATALOG.byId("t");
    expect(definition.buildSpawnDef(50, 30)).toEqual({ col: 2, row: 1 });
  });

  it("spawner spawns a marker and serializes its config", () => {
    const world = createWorld();
    const entity = instantiateObject(STANDARD_CATALOG, "spawner", world, makeWorldEl(), {
      x: 100,
      y: 200,
      category: "piece",
      allowedTypes: ["o", "t"],
      strategy: "random",
    });
    expect(entity.entityType).toBe("spawner");
    expect(serializeObject(STANDARD_CATALOG, entity)).toEqual({
      type: "spawner",
      x: 100,
      y: 200,
      category: "piece",
      allowedTypes: ["o", "t"],
      strategy: "random",
    });
  });

  it("spawner buildSpawnDef defaults to the catalog's first non-tool category", () => {
    const definition = STANDARD_CATALOG.byId("spawner");
    const def = definition.buildSpawnDef(5, 6, STANDARD_CATALOG);
    expect(def.category).toBe("physics");
    expect(def.allowedTypes).toEqual(["ball"]);

    const pieceOnly = STANDARD_CATALOG.enabledIn(["o", "j", "spawner"]);
    const pieceOnlyDef = definition.buildSpawnDef(5, 6, pieceOnly);
    expect(pieceOnlyDef.category).toBe("piece");
    expect(pieceOnlyDef.allowedTypes).toEqual(["o", "j"]);
  });
});
