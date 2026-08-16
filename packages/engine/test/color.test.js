import { describe, it, expect } from "vitest";
import { hslToHex, randomBallColor } from "../src/color.js";

describe("hslToHex", () => {
  it("converts known HSL values to their hex equivalents", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000"); // red
    expect(hslToHex(120, 100, 50)).toBe("#00ff00"); // green
    expect(hslToHex(240, 100, 50)).toBe("#0000ff"); // blue
    expect(hslToHex(0, 0, 100)).toBe("#ffffff"); // white
  });
});

describe("randomBallColor", () => {
  it("always returns a well-formed hex color", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomBallColor()).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
