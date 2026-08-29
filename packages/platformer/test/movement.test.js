import { describe, it, expect } from "vitest";
import { applyMoveInput, applyJump } from "../src/movement.js";

describe("applyMoveInput", () => {
  it("sets vx to direction * moveSpeed", () => {
    const entity = { vx: 0 };
    applyMoveInput(entity, 1, 200);
    expect(entity.vx).toBe(200);
  });

  it("moves left with direction -1", () => {
    const entity = { vx: 0 };
    applyMoveInput(entity, -1, 200);
    expect(entity.vx).toBe(-200);
  });

  it("stops horizontal movement with direction 0", () => {
    const entity = { vx: 200 };
    applyMoveInput(entity, 0, 200);
    expect(entity.vx).toBe(0);
  });
});

describe("applyJump", () => {
  it("applies an upward impulse and clears grounded when grounded", () => {
    const entity = { vy: 0, grounded: true };
    const jumped = applyJump(entity, 500);
    expect(jumped).toBe(true);
    expect(entity.vy).toBe(-500);
    expect(entity.grounded).toBe(false);
  });

  it("does nothing when not grounded", () => {
    const entity = { vy: 50, grounded: false };
    const jumped = applyJump(entity, 500);
    expect(jumped).toBe(false);
    expect(entity.vy).toBe(50);
  });
});
