import { describe, it, expect } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine";
import { findBallAt, isGravityMarkerVisible, isPlaceGravityButtonEnabled, statusText } from "../src/ui-helpers.js";

describe("findBallAt", () => {
  it("finds a ball whose radius contains the point", () => {
    const world = createWorld();
    const ball = spawn(world, { x: 100, y: 100, radius: 20 });
    expect(findBallAt(world, 110, 110)).toBe(ball);
  });

  it("returns null when no ball contains the point", () => {
    const world = createWorld();
    spawn(world, { x: 100, y: 100, radius: 20 });
    expect(findBallAt(world, 500, 500)).toBeNull();
  });

  it("prefers the last-spawned ball when overlapping", () => {
    const world = createWorld();
    spawn(world, { x: 100, y: 100, radius: 30 });
    const top = spawn(world, { x: 105, y: 105, radius: 30 });
    expect(findBallAt(world, 105, 105)).toBe(top);
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
    expect(statusText("setup")).toMatch(/place a ball/);
    expect(statusText("running")).toMatch(/physics active/);
  });
});
