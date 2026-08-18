import { describe, it, expect } from "vitest";
import { chooseDirection } from "../src/ghostAI.js";

const openAll = () => false;

describe("chooseDirection", () => {
  it("chase (closest): picks the direction that reduces distance to the target", () => {
    // at (0,0), target is due right at (5,0) — "right" should win.
    const dir = chooseDirection(0, 0, null, { col: 5, row: 0 }, openAll, "closest");
    expect(dir).toBe("right");
  });

  it("flee (farthest): picks the direction that increases distance from the target", () => {
    const dir = chooseDirection(0, 0, null, { col: 5, row: 0 }, openAll, "farthest");
    expect(dir).toBe("left");
  });

  it("does not reverse when a non-reversing option exists", () => {
    // moving "right", target is behind (to the left) — a naive nearest-
    // distance pick would reverse, but reversing should be avoided here
    // since down/up are still open (even if they don't help much).
    const isBlocked = (col, row) => row !== 0 && col !== 0; // only the axes through origin are open
    const dir = chooseDirection(0, 0, "right", { col: -5, row: 0 }, isBlocked, "closest");
    expect(dir).not.toBe("left");
  });

  it("reverses when it's a dead end (only option)", () => {
    const isBlocked = (col, row) => !(col === -1 && row === 0); // only "left" (the reverse) is open
    const dir = chooseDirection(0, 0, "right", { col: 0, row: 0 }, isBlocked, "closest");
    expect(dir).toBe("left");
  });

  it("only considers open (non-blocked) directions", () => {
    const isBlocked = (col, row) => row === 0 && col === 1; // "right" is blocked
    const dir = chooseDirection(0, 0, null, { col: 5, row: 0 }, isBlocked, "closest");
    expect(dir).not.toBe("right");
  });

  it("returns the current direction when fully boxed in", () => {
    const isBlocked = () => true;
    const dir = chooseDirection(0, 0, "up", { col: 5, row: 5 }, isBlocked, "closest");
    expect(dir).toBe("up");
  });
});
