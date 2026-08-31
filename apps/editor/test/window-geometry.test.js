import { describe, it, expect } from "vitest";
import { clampPosition, clampSize, detectEdgeZone } from "../src/window-geometry.js";

describe("clampPosition", () => {
  it("leaves a position that's already fully on-screen untouched", () => {
    expect(clampPosition(100, 100, 200, 150, 1280, 800)).toEqual({ x: 100, y: 100 });
  });

  it("keeps at least 40px of the window on-screen when dragged past the left edge", () => {
    const { x } = clampPosition(-500, 100, 200, 150, 1280, 800);
    expect(x).toBe(40 - 200); // MIN_VISIBLE - width
  });

  it("keeps at least 40px of the window on-screen when dragged past the right edge", () => {
    const { x } = clampPosition(5000, 100, 200, 150, 1280, 800);
    expect(x).toBe(1280 - 40);
  });

  it("never allows dragging above topInset (under the fixed header)", () => {
    const { y } = clampPosition(100, -500, 200, 150, 1280, 800, 48);
    expect(y).toBe(48);
  });

  it("defaults topInset to 0 when omitted", () => {
    const { y } = clampPosition(100, -500, 200, 150, 1280, 800);
    expect(y).toBe(0);
  });

  it("keeps at least 40px on-screen when dragged past the bottom edge", () => {
    const { y } = clampPosition(100, 5000, 200, 150, 1280, 800);
    expect(y).toBe(800 - 40);
  });

  it("handles a window wider than the viewport without inverting the clamp range", () => {
    // width(2000) > viewportWidth(1280): minX (40-2000) is far more
    // negative than maxX (1280-40) is small, so Math.max(minX, maxX) must
    // pick maxX as the actual upper bound, not silently allow anything.
    const { x } = clampPosition(100, 100, 2000, 150, 1280, 800);
    expect(x).toBe(100); // still within [minX, maxX], untouched
    const { x: xFarRight } = clampPosition(9999, 100, 2000, 150, 1280, 800);
    expect(xFarRight).toBe(1280 - 40);
  });
});

describe("clampSize", () => {
  it("leaves a size already above the minimums untouched", () => {
    expect(clampSize(300, 200, 180, 100)).toEqual({ width: 300, height: 200 });
  });

  it("floors width at the minimum", () => {
    expect(clampSize(50, 200, 180, 100)).toEqual({ width: 180, height: 200 });
  });

  it("floors height at the minimum", () => {
    expect(clampSize(300, 20, 180, 100)).toEqual({ width: 300, height: 100 });
  });

  it("is exact at the minimum boundary", () => {
    expect(clampSize(180, 100, 180, 100)).toEqual({ width: 180, height: 100 });
  });
});

describe("detectEdgeZone", () => {
  const VW = 1280;
  const VH = 800;

  it("returns null when nowhere near an edge", () => {
    expect(detectEdgeZone(640, 400, VW, VH, 40)).toBeNull();
  });

  it("detects the left edge within the threshold", () => {
    expect(detectEdgeZone(10, 400, VW, VH, 40)).toBe("left");
    expect(detectEdgeZone(40, 400, VW, VH, 40)).toBe("left"); // exact boundary counts
    expect(detectEdgeZone(41, 400, VW, VH, 40)).not.toBe("left");
  });

  it("detects the right edge within the threshold", () => {
    expect(detectEdgeZone(1270, 400, VW, VH, 40)).toBe("right");
    expect(detectEdgeZone(1240, 400, VW, VH, 40)).toBe("right"); // exact boundary counts
  });

  it("detects the bottom edge within the threshold", () => {
    expect(detectEdgeZone(640, 790, VW, VH, 40)).toBe("bottom");
    expect(detectEdgeZone(640, 760, VW, VH, 40)).toBe("bottom"); // exact boundary counts
  });

  it("prefers left/right over bottom near a bottom corner", () => {
    expect(detectEdgeZone(10, 790, VW, VH, 40)).toBe("left");
    expect(detectEdgeZone(1270, 790, VW, VH, 40)).toBe("right");
  });
});
