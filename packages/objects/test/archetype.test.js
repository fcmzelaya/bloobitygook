import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { createCatalog } from "../src/catalog.js";
import { instantiateObject, serializeObject } from "../src/instantiate.js";
import { spawnFromArchetype, serializeFromArchetype, archetypeToDefinition, resolveArchetype } from "../src/archetype.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

const GOBLIN = {
  id: "goblin",
  label: "Goblin",
  category: "character",
  swatch: "#a06a3c",
  boundingRadius: 20,
  physics: { restitution: 0.3, friction: 0.4 },
  properties: [
    { name: "moveSpeed", default: 150, required: true },
    { name: "health", default: 3, required: false },
  ],
  visual: { kind: "shape", shape: "circle", fill: "#a06a3c" },
  behavior: { mode: "static" },
};

describe("spawnFromArchetype", () => {
  it("builds a physics entity from the archetype's boundingRadius/physics/properties", () => {
    const world = createWorld();
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 10, y: 20, stats: { moveSpeed: 200 } }, GOBLIN);

    expect(entity.entityType).toBe("archetypeInstance");
    expect(entity.dynamic).toBe(true);
    expect(entity.radius).toBe(20);
    expect(entity.restitution).toBe(0.3);
    expect(entity.friction).toBe(0.4);
    expect(entity.stats).toEqual({ moveSpeed: 200, health: 3 }); // health falls back to default
    expect(entity.el).toBe(entity.circleEl); // no wrapper group
  });

  it("falls back to every property's default when no overrides are given", () => {
    const world = createWorld();
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, GOBLIN);
    expect(entity.stats).toEqual({ moveSpeed: 150, health: 3 });
  });

  it("falls back to the default for a missing required property rather than throwing", () => {
    const world = createWorld();
    expect(() =>
      spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0, stats: {} }, GOBLIN)
    ).not.toThrow();
  });

  it("renders a rect visual when the archetype specifies one", () => {
    const world = createWorld();
    const rectArchetype = { ...GOBLIN, visual: { kind: "shape", shape: "rect", fill: "#fff" } };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, rectArchetype);
    expect(entity.el.tagName).toBe("rect");
  });

  it("throws for a genuinely unknown visual kind", () => {
    const world = createWorld();
    const badArchetype = { ...GOBLIN, visual: { kind: "sprite" } };
    expect(() => spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, badArchetype)).toThrow(
      /Unsupported visual kind/
    );
  });

  it("renders an svg visual's sanitized markup inside a <g> wrapper", () => {
    const world = createWorld();
    const svgArchetype = {
      ...GOBLIN,
      visual: { kind: "svg", svgMarkup: '<circle cx="0" cy="0" r="10" fill="#0f0"/>' },
    };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, svgArchetype);
    expect(entity.el.tagName).toBe("g");
    expect(entity.circleEl).toBeNull();
    expect(entity.el.querySelector("circle")).not.toBeNull();
    expect(entity.el.querySelector("circle").getAttribute("fill")).toBe("#0f0");
  });

  it("strips a malicious payload from an svg visual even if the stored record wasn't pre-cleaned", () => {
    const world = createWorld();
    const svgArchetype = {
      ...GOBLIN,
      visual: { kind: "svg", svgMarkup: '<script>alert(1)</script><circle r="10"/>' },
    };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, svgArchetype);
    expect(entity.el.querySelector("script")).toBeNull();
    expect(entity.el.querySelector("circle")).not.toBeNull();
  });
});

describe("spawnFromArchetype physics.dynamic / physics.platformSize", () => {
  it("defaults to a dynamic (physics-driven) entity when physics.dynamic is omitted", () => {
    const world = createWorld();
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, GOBLIN);
    expect(entity.dynamic).toBe(true);
    expect("dynamic" in entity).toBe(true);
  });

  it("omits the dynamic field entirely (not just sets it false) when physics.dynamic is false", () => {
    const world = createWorld();
    const platform = { ...GOBLIN, physics: { ...GOBLIN.physics, dynamic: false } };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, platform);
    // query() matches on key presence, not truthiness — a lingering
    // `dynamic: false` key would still be picked up by gravitySystem/
    // integrateSystem/collisionSystem, so this must be a real omission.
    expect("dynamic" in entity).toBe(false);
  });

  it("carries platformSize onto the entity when the archetype sets it", () => {
    const world = createWorld();
    const platform = { ...GOBLIN, physics: { ...GOBLIN.physics, dynamic: false, platformSize: { width: 120, height: 20 } } };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, platform);
    expect(entity.platformSize).toEqual({ width: 120, height: 20 });
  });

  it("omits platformSize when the archetype doesn't set it", () => {
    const world = createWorld();
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, GOBLIN);
    expect("platformSize" in entity).toBe(false);
  });

  it("renders a rect visual sized to platformSize rather than the square boundingRadius shape", () => {
    const world = createWorld();
    const platform = {
      ...GOBLIN,
      boundingRadius: 80,
      visual: { kind: "shape", shape: "rect", fill: "#5b7ca8" },
      physics: { ...GOBLIN.physics, dynamic: false, platformSize: { width: 160, height: 20 } },
    };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, platform);
    expect(entity.el.getAttribute("width")).toBe("160");
    expect(entity.el.getAttribute("height")).toBe("20");
    expect(entity.el.getAttribute("x")).toBe("-80");
    expect(entity.el.getAttribute("y")).toBe("-10");
  });
});

describe("spawnFromArchetype behavior wiring", () => {
  it("attaches no behavior for mode 'static' (or when behavior is omitted)", () => {
    const world = createWorld();
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, GOBLIN); // behavior: {mode:"static"}
    expect(entity.behavior).toBeUndefined();
    expect(entity.player).toBeUndefined();
  });

  it("wires a real state machine for mode 'scripted', starting at the preset's first state", () => {
    const world = createWorld();
    const patrolling = { ...GOBLIN, behavior: { mode: "scripted", preset: "patrol", range: 10, speed: 50 } };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, patrolling);
    expect(entity.behavior.current).toBe("right");
    expect(entity.behavior.states.right).toBeDefined();
    expect(entity.behavior.states.left).toBeDefined();
  });

  it("throws for an unknown behavior preset", () => {
    const world = createWorld();
    const bad = { ...GOBLIN, behavior: { mode: "scripted", preset: "teleport" } };
    expect(() => spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, bad)).toThrow(/Unknown behavior preset/);
  });

  it("tags the entity as the player and stores an inputMap for mode 'input', without touching entity.behavior", () => {
    const world = createWorld();
    const controllable = {
      ...GOBLIN,
      behavior: { mode: "input", inputMap: { ArrowLeft: { onPress: "moveLeft", onRelease: "stopMoving" } } },
    };
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, controllable);
    expect(entity.player).toBe(true);
    expect(entity.inputMap).toEqual({ ArrowLeft: { onPress: "moveLeft", onRelease: "stopMoving" } });
    expect(entity.behavior).toBeUndefined(); // would collide with behaviorSystem's state-machine assumption
  });

  it("throws for an unknown behavior mode", () => {
    const world = createWorld();
    const bad = { ...GOBLIN, behavior: { mode: "possessed" } };
    expect(() => spawnFromArchetype(world, makeWorldEl(), { x: 0, y: 0 }, bad)).toThrow(/Unknown behavior mode/);
  });
});

describe("serializeFromArchetype", () => {
  it("round-trips position, velocity, and stats", () => {
    const world = createWorld();
    const entity = spawnFromArchetype(world, makeWorldEl(), { x: 10.5, y: 20.25, stats: { moveSpeed: 175 } }, GOBLIN);
    expect(serializeFromArchetype(entity)).toEqual({
      x: 10.5,
      y: 20.25,
      vx: 0,
      vy: 0,
      stats: { moveSpeed: 175, health: 3 },
    });
  });
});

describe("archetypeToDefinition", () => {
  it("produces an ordinary catalog definition usable through instantiateObject/serializeObject", () => {
    const world = createWorld();
    const catalog = createCatalog([archetypeToDefinition(GOBLIN)]);

    const entity = instantiateObject(catalog, "goblin", world, makeWorldEl(), { x: 5, y: 6, stats: { health: 1 } });
    expect(entity.catalogId).toBe("goblin");
    expect(serializeObject(catalog, entity)).toEqual({
      type: "goblin",
      x: 5,
      y: 6,
      vx: 0,
      vy: 0,
      stats: { moveSpeed: 150, health: 1 },
    });
  });

  it("buildSpawnDef returns every property at its default", () => {
    const definition = archetypeToDefinition(GOBLIN);
    expect(definition.buildSpawnDef(1, 2)).toEqual({ x: 1, y: 2, stats: { moveSpeed: 150, health: 3 } });
  });
});

describe("resolveArchetype", () => {
  it("returns the archetype unchanged when it doesn't extend anything", () => {
    expect(resolveArchetype(GOBLIN, new Map())).toBe(GOBLIN);
  });

  it("merges physics/visual and overrides same-named properties from the parent", () => {
    const base = {
      ...GOBLIN,
      id: "base-enemy",
      physics: { restitution: 0.3, friction: 0.4 },
      visual: { kind: "shape", shape: "circle", fill: "#a06a3c" },
      properties: [
        { name: "moveSpeed", default: 150, required: true },
        { name: "health", default: 3, required: false },
      ],
    };
    const child = {
      id: "goblin-elite",
      extends: "base-enemy",
      label: "Goblin Elite",
      category: "character",
      swatch: "#ff0000",
      boundingRadius: 24,
      physics: { restitution: 0.9 },
      visual: { fill: "#ff0000" },
      properties: [{ name: "health", default: 10, required: false }],
    };
    const byId = new Map([["base-enemy", base]]);

    const resolved = resolveArchetype(child, byId);
    expect(resolved.physics).toEqual({ restitution: 0.9, friction: 0.4 });
    expect(resolved.visual).toEqual({ kind: "shape", shape: "circle", fill: "#ff0000" });
    expect(resolved.properties).toEqual([
      { name: "moveSpeed", default: 150, required: true },
      { name: "health", default: 10, required: false },
    ]);
    expect(resolved.boundingRadius).toBe(24); // child's own field, not inherited
  });

  it("lets the child's own behavior win wholesale over the parent's", () => {
    const base = { ...GOBLIN, id: "base", behavior: { mode: "scripted", preset: "patrol" } };
    const child = { id: "child", extends: "base", behavior: { mode: "scripted", preset: "chase" } };
    const resolved = resolveArchetype(child, new Map([["base", base]]));
    expect(resolved.behavior).toEqual({ mode: "scripted", preset: "chase" });
  });

  it("falls back to the parent's behavior when the child doesn't set one", () => {
    const base = { ...GOBLIN, id: "base", behavior: { mode: "scripted", preset: "patrol" } };
    const child = { id: "child", extends: "base", label: "Child" };
    const resolved = resolveArchetype(child, new Map([["base", base]]));
    expect(resolved.behavior).toEqual({ mode: "scripted", preset: "patrol" });
  });

  it("walks a multi-level chain (grandparent -> parent -> child)", () => {
    const grandparent = { id: "gp", label: "GP", category: "character", swatch: "#000", boundingRadius: 10, physics: { restitution: 0.1, friction: 0.1 }, properties: [], visual: { kind: "shape", shape: "circle", fill: "#000" }, behavior: { mode: "static" } };
    const parent = { id: "p", extends: "gp", physics: { restitution: 0.5 } };
    const child = { id: "c", extends: "p", physics: { friction: 0.9 } };
    const byId = new Map([["gp", grandparent], ["p", parent]]);
    const resolved = resolveArchetype(child, byId);
    expect(resolved.physics).toEqual({ restitution: 0.5, friction: 0.9 });
    expect(resolved.boundingRadius).toBe(10);
  });

  it("throws a clear error for a cycle instead of recursing forever", () => {
    const a = { id: "a", extends: "b" };
    const b = { id: "b", extends: "a" };
    const byId = new Map([["a", a], ["b", b]]);
    expect(() => resolveArchetype(a, byId)).toThrow(/cycle/i);
  });

  it("throws a clear error when extending an id that doesn't exist", () => {
    const orphan = { id: "orphan", extends: "nonexistent" };
    expect(() => resolveArchetype(orphan, new Map())).toThrow(/unknown archetype/i);
  });
});
