import { describe, it, expect } from "vitest";
import { createWorld, spawn, destroy, query, clear } from "../src/world.js";

describe("world", () => {
  it("assigns incrementing ids on spawn", () => {
    const world = createWorld();
    const a = spawn(world, { x: 0 });
    const b = spawn(world, { x: 0 });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });

  it("query returns only entities that have every requested field", () => {
    const world = createWorld();
    const a = spawn(world, { x: 0 });
    const b = spawn(world, { x: 0, y: 0 });
    expect(query(world, ["x", "y"])).toEqual([b]);
    expect(query(world, ["x"])).toEqual([a, b]);
  });

  it("destroy removes only the matching entity", () => {
    const world = createWorld();
    const a = spawn(world, {});
    const b = spawn(world, {});
    destroy(world, a.id);
    expect(world.entities).toEqual([b]);
  });

  it("destroy is a no-op for an id that doesn't exist", () => {
    const world = createWorld();
    const a = spawn(world, {});
    destroy(world, 999);
    expect(world.entities).toEqual([a]);
  });

  it("clear empties every entity", () => {
    const world = createWorld();
    spawn(world, {});
    spawn(world, {});
    clear(world);
    expect(world.entities).toEqual([]);
  });
});
