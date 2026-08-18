import { describe, it, expect } from "vitest";
import { tryMove, currentCell, isAtCellCenter } from "../src/movement.js";

const CELL = 100;
const neverBlocked = () => false;

describe("tryMove", () => {
  it("advances straight ahead when nowhere near a cell center", () => {
    const entity = { x: 50, y: 0, direction: "right", queuedDirection: null, speed: 10 };
    tryMove(entity, 0.1, neverBlocked, CELL); // step = 1
    expect(entity.x).toBe(51);
    expect(entity.y).toBe(0);
    expect(entity.direction).toBe("right");
  });

  it("turns onto the queued direction exactly at a cell center", () => {
    const entity = { x: 100, y: 0, direction: "right", queuedDirection: "down", speed: 10 };
    const isBlocked = (col, row) => col === 2 && row === 0; // only "right" from here is blocked
    tryMove(entity, 0.1, isBlocked, CELL); // step = 1, already at center (distToCenter 0)
    expect(entity.direction).toBe("down");
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(1); // the full step gets spent in the new direction
  });

  it("ignores a queued direction that's blocked, keeps going straight", () => {
    const entity = { x: 100, y: 0, direction: "right", queuedDirection: "down", speed: 10 };
    const isBlocked = (col, row) => col === 1 && row === 1; // "down" from here is blocked
    tryMove(entity, 0.1, isBlocked, CELL);
    expect(entity.direction).toBe("right");
    expect(entity.x).toBe(101);
  });

  it("stops exactly at the cell center when the way ahead is blocked and nothing is queued", () => {
    const entity = { x: 95, y: 0, direction: "right", queuedDirection: null, speed: 10 };
    const isBlocked = (col, row) => col === 2 && row === 0;
    tryMove(entity, 1, isBlocked, CELL); // step = 10, distToCenter = 5
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(0);
    expect(entity.direction).toBeNull();
  });

  it("passes through an unblocked center, spending the remaining distance beyond it", () => {
    // distToCenter (5) < step (10): snaps to the exact center, then
    // continues with the leftover 5px — not a raw x += step, which would
    // give the same answer here only by coincidence (95 + 10 = 105 too).
    const entity = { x: 95, y: 0, direction: "right", queuedDirection: null, speed: 10 };
    tryMove(entity, 1, neverBlocked, CELL);
    expect(entity.x).toBe(105);
    expect(entity.direction).toBe("right");
  });

  it("accumulates correctly across repeated ticks in an open corridor", () => {
    const entity = { x: 0, y: 0, direction: "right", queuedDirection: null, speed: 50 };
    for (let i = 0; i < 5; i++) tryMove(entity, 0.1, neverBlocked, CELL); // 5 * 5px = 25px
    expect(entity.x).toBeCloseTo(25);
  });

  it("a stopped entity (direction null) with nothing queued stays put", () => {
    const entity = { x: 100, y: 0, direction: null, queuedDirection: null, speed: 10 };
    tryMove(entity, 1, neverBlocked, CELL);
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(0);
  });
});

describe("currentCell / isAtCellCenter", () => {
  it("rounds pixel position to the nearest cell", () => {
    expect(currentCell({ x: 120, y: 240 }, CELL)).toEqual({ col: 1, row: 2 });
  });

  it("isAtCellCenter is true only exactly on a grid point", () => {
    expect(isAtCellCenter({ x: 100, y: 200 }, CELL)).toBe(true);
    expect(isAtCellCenter({ x: 101, y: 200 }, CELL)).toBe(false);
  });
});
