import { describe, it, expect } from "vitest";
import { ARCHETYPE_ACTIONS } from "../src/actions.js";

describe("ARCHETYPE_ACTIONS", () => {
  it("moveLeft/moveRight/stopMoving set vx from the entity's own moveSpeed stat", () => {
    const entity = { vx: 0, stats: { moveSpeed: 200 } };
    ARCHETYPE_ACTIONS.moveLeft(entity);
    expect(entity.vx).toBe(-200);
    ARCHETYPE_ACTIONS.moveRight(entity);
    expect(entity.vx).toBe(200);
    ARCHETYPE_ACTIONS.stopMoving(entity);
    expect(entity.vx).toBe(0);
  });

  it("jump only applies when grounded, using the entity's own jumpImpulse stat", () => {
    const grounded = { vy: 0, grounded: true, stats: { jumpImpulse: 400 } };
    expect(ARCHETYPE_ACTIONS.jump(grounded)).toBe(true);
    expect(grounded.vy).toBe(-400);

    const airborne = { vy: 50, grounded: false, stats: { jumpImpulse: 400 } };
    expect(ARCHETYPE_ACTIONS.jump(airborne)).toBe(false);
    expect(airborne.vy).toBe(50);
  });

  it("tolerates a missing stats bag by defaulting to 0", () => {
    const entity = { vx: 0 };
    expect(() => ARCHETYPE_ACTIONS.moveLeft(entity)).not.toThrow();
    expect(entity.vx).toBeCloseTo(0); // -1 * 0 === -0, not === 0, but physically identical
  });
});
