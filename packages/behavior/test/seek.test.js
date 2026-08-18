import { describe, it, expect } from "vitest";
import { seekToward, fleeFrom } from "../src/seek.js";

describe("seekToward", () => {
  it("moves toward the target at the given speed", () => {
    const result = seekToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 1); // 5 units in 1s
    expect(result).toEqual({ x: 5, y: 0 });
  });

  it("moves diagonally along the correct vector", () => {
    const result = seekToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 5, 1); // dist 5, full step
    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(4);
  });

  it("clamps at the target instead of overshooting", () => {
    const result = seekToward({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 1); // way more than needed
    expect(result).toEqual({ x: 1, y: 0 });
  });

  it("returns the same position when already at the target (no NaN from zero distance)", () => {
    const result = seekToward({ x: 5, y: 5 }, { x: 5, y: 5 }, 10, 1);
    expect(result).toEqual({ x: 5, y: 5 });
  });
});

describe("fleeFrom", () => {
  it("moves directly away from the threat", () => {
    const result = fleeFrom({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 1);
    expect(result).toEqual({ x: -5, y: 0 });
  });

  it("does not throw when exactly on top of the threat", () => {
    expect(() => fleeFrom({ x: 5, y: 5 }, { x: 5, y: 5 }, 10, 1)).not.toThrow();
  });
});
