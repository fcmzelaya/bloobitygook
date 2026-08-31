import { describe, it, expect } from "vitest";
import { createWorld, spawn } from "../src/world.js";
import { attachChild, hierarchySystem, destroyWithChildren } from "../src/hierarchy.js";

describe("attachChild / hierarchySystem", () => {
  it("copies the parent's position plus the child's offset", () => {
    const world = createWorld();
    const parent = spawn(world, { x: 100, y: 200 });
    const child = spawn(world, { x: 0, y: 0 });
    attachChild(child, parent, { x: 10, y: -5 });

    hierarchySystem(world);
    expect(child.x).toBe(110);
    expect(child.y).toBe(195);

    parent.x = 300;
    parent.y = 300;
    hierarchySystem(world);
    expect(child.x).toBe(310);
    expect(child.y).toBe(295);
  });

  it("defaults to a zero offset", () => {
    const world = createWorld();
    const parent = spawn(world, { x: 5, y: 6 });
    const child = spawn(world, { x: 0, y: 0 });
    attachChild(child, parent);
    hierarchySystem(world);
    expect(child.x).toBe(5);
    expect(child.y).toBe(6);
  });

  it("leaves an orphaned child frozen at its last position instead of throwing", () => {
    const world = createWorld();
    const parent = spawn(world, { x: 1, y: 1 });
    const child = spawn(world, { x: 0, y: 0 });
    attachChild(child, parent, { x: 0, y: 0 });
    hierarchySystem(world);
    child.parentId = 9999; // simulate a destroyed parent's id lingering
    expect(() => hierarchySystem(world)).not.toThrow();
    expect(child.x).toBe(1);
    expect(child.y).toBe(1);
  });

  it("ignores entities with no parentId/offset", () => {
    const world = createWorld();
    const solo = spawn(world, { x: 42, y: 42 });
    expect(() => hierarchySystem(world)).not.toThrow();
    expect(solo.x).toBe(42);
  });
});

describe("destroyWithChildren", () => {
  it("destroys a parent and all of its children", () => {
    const world = createWorld();
    const parent = spawn(world, { x: 0, y: 0 });
    const childA = spawn(world, { x: 0, y: 0 });
    const childB = spawn(world, { x: 0, y: 0 });
    attachChild(childA, parent);
    attachChild(childB, parent);

    destroyWithChildren(world, parent.id);
    expect(world.entities).toEqual([]);
  });

  it("destroys a multi-level subtree, children before the parent", () => {
    const world = createWorld();
    const grandparent = spawn(world, { x: 0, y: 0 });
    const parent = spawn(world, { x: 0, y: 0 });
    const child = spawn(world, { x: 0, y: 0 });
    attachChild(parent, grandparent);
    attachChild(child, parent);

    destroyWithChildren(world, grandparent.id);
    expect(world.entities).toEqual([]);
  });

  it("leaves unrelated entities untouched", () => {
    const world = createWorld();
    const parent = spawn(world, { x: 0, y: 0 });
    const child = spawn(world, { x: 0, y: 0 });
    attachChild(child, parent);
    const bystander = spawn(world, { x: 0, y: 0 });

    destroyWithChildren(world, parent.id);
    expect(world.entities).toEqual([bystander]);
  });
});
