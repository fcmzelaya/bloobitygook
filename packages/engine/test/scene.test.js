import { describe, it, expect } from "vitest";
import { DEFAULT_GRAVITY, normalizeGravity } from "../src/scene.js";

describe("normalizeGravity", () => {
  it("upgrades a legacy bare-number gravity value to the current shape", () => {
    expect(normalizeGravity(900)).toEqual({ mode: "uniform", magnitude: 900, x: 400, y: 300 });
  });

  it("defaults to DEFAULT_GRAVITY when gravity is missing", () => {
    expect(normalizeGravity(undefined)).toEqual(DEFAULT_GRAVITY);
    expect(normalizeGravity(null)).toEqual(DEFAULT_GRAVITY);
  });

  it("merges a partial gravity object over the defaults", () => {
    expect(normalizeGravity({ mode: "point", magnitude: 500, x: 200 })).toEqual({
      mode: "point",
      magnitude: 500,
      x: 200,
      y: 300,
    });
  });
});
