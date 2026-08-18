// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine";
import { createAnimation, advanceAnimation, animationSystem } from "../src/animation.js";

describe("createAnimation", () => {
  it("throws with no frames", () => {
    expect(() => createAnimation([], 10)).toThrow(/at least one frame/);
  });

  it("starts at frame 0 with no elapsed time", () => {
    const anim = createAnimation([{ fill: "#f00" }, { fill: "#0f0" }], 10);
    expect(anim.frame).toBe(0);
    expect(anim.elapsed).toBe(0);
  });
});

describe("advanceAnimation", () => {
  it("does nothing before a full frame's worth of time passes", () => {
    const anim = createAnimation([{ fill: "#f00" }, { fill: "#0f0" }], 10); // 0.1s/frame
    const onChange = vi.fn();
    advanceAnimation(anim, 0.05, onChange);
    expect(anim.frame).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("advances one frame and calls the callback once enough time passes", () => {
    const anim = createAnimation([{ fill: "#f00" }, { fill: "#0f0" }], 10);
    const onChange = vi.fn();
    advanceAnimation(anim, 0.1, onChange);
    expect(anim.frame).toBe(1);
    expect(onChange).toHaveBeenCalledWith({ fill: "#0f0" });
  });

  it("wraps back to frame 0 past the last frame", () => {
    const anim = createAnimation([{ fill: "#f00" }, { fill: "#0f0" }], 10);
    advanceAnimation(anim, 0.1, () => {});
    advanceAnimation(anim, 0.1, () => {});
    expect(anim.frame).toBe(0);
  });

  it("catches up correctly on a large dt spanning multiple frames", () => {
    const anim = createAnimation([{ fill: "a" }, { fill: "b" }, { fill: "c" }], 10); // 0.1s/frame
    advanceAnimation(anim, 0.35, () => {}); // 3.5 frames worth
    expect(anim.frame).toBe(3 % 3); // advanced 3 whole frames from 0
    expect(anim.elapsed).toBeCloseTo(0.05);
  });
});

describe("animationSystem", () => {
  it("applies the current frame's attributes to the entity's element", () => {
    const world = createWorld();
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    spawn(world, { animation: createAnimation([{ fill: "#f00" }, { fill: "#0f0" }], 10), el });

    animationSystem(world, 0.1);

    expect(el.getAttribute("fill")).toBe("#0f0");
  });

  it("leaves the element untouched when no frame boundary is crossed", () => {
    const world = createWorld();
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("fill", "#000");
    spawn(world, { animation: createAnimation([{ fill: "#f00" }, { fill: "#0f0" }], 10), el });

    animationSystem(world, 0.01);

    expect(el.getAttribute("fill")).toBe("#000");
  });
});
