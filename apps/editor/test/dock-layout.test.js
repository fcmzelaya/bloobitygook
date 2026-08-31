import { describe, it, expect } from "vitest";
import { computeDockLayout } from "../src/dock-layout.js";
import { TOP_INSET, DOCK_WIDTH, DOCK_HEIGHT } from "../src/layout-constants.js";

const VW = 1280;
const VH = 800;

describe("computeDockLayout", () => {
  it("returns nothing for windows assigned to float", () => {
    expect(computeDockLayout({ a: "float", b: "float" }, VW, VH)).toEqual({});
  });

  it("gives a single left-docked window the full column", () => {
    const rects = computeDockLayout({ a: "left" }, VW, VH);
    expect(rects.a).toEqual({ x: 0, y: TOP_INSET, width: DOCK_WIDTH, height: VH - TOP_INSET });
  });

  it("splits two left-docked windows evenly by height", () => {
    const rects = computeDockLayout({ a: "left", b: "left" }, VW, VH);
    const half = (VH - TOP_INSET) / 2;
    expect(rects.a).toEqual({ x: 0, y: TOP_INSET, width: DOCK_WIDTH, height: half });
    expect(rects.b).toEqual({ x: 0, y: TOP_INSET + half, width: DOCK_WIDTH, height: half });
  });

  it("splits three left-docked windows evenly", () => {
    const rects = computeDockLayout({ a: "left", b: "left", c: "left" }, VW, VH);
    const third = (VH - TOP_INSET) / 3;
    expect(rects.a.height).toBeCloseTo(third);
    expect(rects.b.height).toBeCloseTo(third);
    expect(rects.c.height).toBeCloseTo(third);
    expect(rects.b.y).toBeCloseTo(TOP_INSET + third);
    expect(rects.c.y).toBeCloseTo(TOP_INSET + third * 2);
  });

  it("anchors the right column to the right edge of the viewport", () => {
    const rects = computeDockLayout({ a: "right" }, VW, VH);
    expect(rects.a).toEqual({ x: VW - DOCK_WIDTH, y: TOP_INSET, width: DOCK_WIDTH, height: VH - TOP_INSET });
  });

  it("splits right-docked windows evenly, independent of the left column", () => {
    const rects = computeDockLayout({ a: "right", b: "right", c: "left" }, VW, VH);
    const half = (VH - TOP_INSET) / 2;
    expect(rects.a.height).toBeCloseTo(half);
    expect(rects.b.height).toBeCloseTo(half);
    expect(rects.c.height).toBe(VH - TOP_INSET); // sole left occupant gets the full column
  });

  it("spans the bottom row between the two side columns", () => {
    const rects = computeDockLayout({ a: "bottom" }, VW, VH);
    expect(rects.a).toEqual({ x: DOCK_WIDTH, y: VH - DOCK_HEIGHT, width: VW - DOCK_WIDTH * 2, height: DOCK_HEIGHT });
  });

  it("keeps the bottom row's span fixed regardless of whether the side columns are occupied", () => {
    const withSides = computeDockLayout({ a: "bottom", b: "left", c: "right" }, VW, VH);
    const withoutSides = computeDockLayout({ a: "bottom" }, VW, VH);
    expect(withSides.a.x).toBe(withoutSides.a.x);
    expect(withSides.a.width).toBe(withoutSides.a.width);
  });

  it("splits bottom-docked windows evenly by width", () => {
    const rects = computeDockLayout({ a: "bottom", b: "bottom" }, VW, VH);
    const half = (VW - DOCK_WIDTH * 2) / 2;
    expect(rects.a).toEqual({ x: DOCK_WIDTH, y: VH - DOCK_HEIGHT, width: half, height: DOCK_HEIGHT });
    expect(rects.b).toEqual({ x: DOCK_WIDTH + half, y: VH - DOCK_HEIGHT, width: half, height: DOCK_HEIGHT });
  });

  it("returns an empty object when nothing is docked", () => {
    expect(computeDockLayout({}, VW, VH)).toEqual({});
  });

  it("never produces a negative column height on a very short viewport", () => {
    const rects = computeDockLayout({ a: "left" }, VW, 10);
    expect(rects.a.height).toBe(0);
  });
});
