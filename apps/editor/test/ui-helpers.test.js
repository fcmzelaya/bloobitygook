import { describe, it, expect } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine/core";
import { findEntityAt, isGravityMarkerVisible, isPlaceGravityButtonEnabled, statusText } from "../src/ui-helpers.js";

describe("findEntityAt", () => {
  it("finds an entity whose radius contains the point", () => {
    const world = createWorld();
    const ball = spawn(world, { x: 100, y: 100, radius: 20 });
    expect(findEntityAt(world, 110, 110)).toBe(ball);
  });

  it("returns null when no entity contains the point", () => {
    const world = createWorld();
    spawn(world, { x: 100, y: 100, radius: 20 });
    expect(findEntityAt(world, 500, 500)).toBeNull();
  });

  it("prefers the last-spawned entity when overlapping", () => {
    const world = createWorld();
    spawn(world, { x: 100, y: 100, radius: 30 });
    const top = spawn(world, { x: 105, y: 105, radius: 30 });
    expect(findEntityAt(world, 105, 105)).toBe(top);
  });

  it("hit-tests a spawner marker the same way as a ball (both have x/y/radius)", () => {
    const world = createWorld();
    const marker = spawn(world, { entityType: "spawner", x: 200, y: 200, radius: 14 });
    expect(findEntityAt(world, 205, 205)).toBe(marker);
  });

  it("ignores a grid-based entity that has no radius", () => {
    const world = createWorld();
    spawn(world, { entityType: "cellGroup", col: 1, row: 1 });
    expect(findEntityAt(world, 1, 1)).toBeNull();
  });
});

describe("gravity UI predicates", () => {
  it("marker is visible only in point mode", () => {
    expect(isGravityMarkerVisible({ mode: "point" })).toBe(true);
    expect(isGravityMarkerVisible({ mode: "uniform" })).toBe(false);
  });

  it("place-gravity button is enabled only in setup + point mode", () => {
    expect(isPlaceGravityButtonEnabled("setup", { mode: "point" })).toBe(true);
    expect(isPlaceGravityButtonEnabled("running", { mode: "point" })).toBe(false);
    expect(isPlaceGravityButtonEnabled("setup", { mode: "uniform" })).toBe(false);
  });
});

describe("statusText", () => {
  it("describes each mode", () => {
    expect(statusText("setup")).toMatch(/place the selected object/);
    expect(statusText("running")).toMatch(/physics active/);
  });
});
