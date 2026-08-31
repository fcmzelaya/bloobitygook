import { describe, it, expect } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine/core";
import { platformCarrySystem } from "../src/platformCarry.js";

function makePlatform(world, x, y, width, height) {
  return spawn(world, { x, y, platformSize: { width, height } });
}

function makeRider(world, x, y, radius) {
  return spawn(world, { x, y, radius, vx: 0, vy: 0 });
}

describe("platformCarrySystem", () => {
  it("does nothing on the first tick (no prior position to diff against)", () => {
    const world = createWorld();
    const platform = makePlatform(world, 100, 100, 80, 20);
    const rider = makeRider(world, 100, 80, 10); // feet at 90, matches platform top (90) -> standing
    platformCarrySystem(world);
    expect(rider.x).toBe(100);
    expect(rider.y).toBe(80);
    expect(rider.grounded).toBe(true);
  });

  it("carries a standing rider by the platform's frame-to-frame delta", () => {
    const world = createWorld();
    const platform = makePlatform(world, 100, 100, 80, 20);
    const rider = makeRider(world, 100, 80, 10); // feet at 90, matches platform top (90)
    platformCarrySystem(world); // first tick: establishes prevX/prevY, no movement yet

    platform.x += 15;
    platform.y -= 3;
    platformCarrySystem(world);

    expect(rider.x).toBe(115);
    expect(rider.y).toBe(77);
  });

  it("does not move a rider that isn't horizontally overlapping the platform", () => {
    const world = createWorld();
    const platform = makePlatform(world, 100, 100, 80, 20); // spans x in [60, 140]
    const rider = makeRider(world, 200, 80, 10); // far to the right
    platformCarrySystem(world);
    platform.x += 15;
    platformCarrySystem(world);
    expect(rider.x).toBe(200);
  });

  it("does not move a rider that isn't standing on top (too far below)", () => {
    const world = createWorld();
    const platform = makePlatform(world, 100, 100, 80, 20); // top at y=90
    const rider = makeRider(world, 100, 40, 10); // feet at 50, nowhere near the top
    platformCarrySystem(world);
    platform.x += 15;
    platformCarrySystem(world);
    expect(rider.x).toBe(100);
  });

  it("is a no-op when there are no platforms", () => {
    const world = createWorld();
    const rider = makeRider(world, 0, 0, 10);
    expect(() => platformCarrySystem(world)).not.toThrow();
    expect(rider.x).toBe(0);
  });
});
