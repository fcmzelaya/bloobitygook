// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createWorld } from "../src/world.js";
import { serializeScene, loadScene, DEFAULT_GRAVITY } from "../src/scene.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

describe("loadScene gravity normalization", () => {
  it("upgrades a legacy bare-number gravity value to the current shape", () => {
    const world = createWorld();
    const gravity = loadScene(world, makeWorldEl(), { objects: [], gravity: 900 });
    expect(gravity).toEqual({ mode: "uniform", magnitude: 900, x: 400, y: 300 });
  });

  it("defaults to DEFAULT_GRAVITY when gravity is missing", () => {
    const world = createWorld();
    const gravity = loadScene(world, makeWorldEl(), { objects: [] });
    expect(gravity).toEqual(DEFAULT_GRAVITY);
  });

  it("merges a partial gravity object over the defaults", () => {
    const world = createWorld();
    const gravity = loadScene(world, makeWorldEl(), {
      objects: [],
      gravity: { mode: "point", magnitude: 500, x: 200 },
    });
    expect(gravity).toEqual({ mode: "point", magnitude: 500, x: 200, y: 300 });
  });
});

describe("loadScene object spawning", () => {
  it("skips an unknown object type without throwing", () => {
    const world = createWorld();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      loadScene(world, makeWorldEl(), { objects: [{ type: "triangle", x: 0, y: 0 }] })
    ).not.toThrow();
    expect(world.entities).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("clears prior entities before loading new ones", () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    loadScene(world, worldEl, { objects: [{ type: "ball", x: 0, y: 0 }] });
    expect(world.entities).toHaveLength(1);
    loadScene(world, worldEl, { objects: [] });
    expect(world.entities).toHaveLength(0);
  });
});

describe("serializeScene", () => {
  it("round-trips a ball's fields through load -> serialize", () => {
    const world = createWorld();
    loadScene(world, makeWorldEl(), {
      objects: [
        { type: "ball", x: 10.5, y: 20.25, radius: 16, color: "#fff", restitution: 0.5, friction: 0.1 },
      ],
    });
    const out = serializeScene(world, DEFAULT_GRAVITY);
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
});
