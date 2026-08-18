import { describe, it, expect } from "vitest";
import { createZone, isInsideZone, zoneEntryCondition } from "../src/zone.js";

describe("isInsideZone", () => {
  const zone = createZone(10, 10, 20, 20); // spans x:10-30, y:10-30

  it("is true for a point inside the zone, including its edges", () => {
    expect(isInsideZone(zone, { x: 20, y: 20 })).toBe(true);
    expect(isInsideZone(zone, { x: 10, y: 10 })).toBe(true);
    expect(isInsideZone(zone, { x: 30, y: 30 })).toBe(true);
  });

  it("is false for a point outside the zone", () => {
    expect(isInsideZone(zone, { x: 9, y: 20 })).toBe(false);
    expect(isInsideZone(zone, { x: 20, y: 31 })).toBe(false);
  });
});

describe("zoneEntryCondition", () => {
  it("filters the entityFilter's results down to ones inside the zone", () => {
    const zone = createZone(0, 0, 10, 10);
    const inside = { x: 5, y: 5, name: "inside" };
    const outside = { x: 50, y: 50, name: "outside" };
    const condition = zoneEntryCondition(zone, () => [inside, outside]);

    expect(condition("world-not-inspected")).toEqual([inside]);
  });

  it("passes the world through to entityFilter unchanged", () => {
    const zone = createZone(0, 0, 10, 10);
    let receivedWorld = null;
    const condition = zoneEntryCondition(zone, (world) => {
      receivedWorld = world;
      return [];
    });

    condition({ marker: 42 });
    expect(receivedWorld).toEqual({ marker: 42 });
  });
});
