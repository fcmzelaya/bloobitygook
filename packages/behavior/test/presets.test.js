import { describe, it, expect } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine/core";
import { createBehavior, stepBehavior } from "../src/stateMachine.js";
import { BEHAVIOR_PRESETS } from "../src/presets.js";

describe("stationary preset", () => {
  it("does nothing, ever", () => {
    const world = createWorld();
    const entity = spawn(world, { x: 5, vx: 0 });
    const behavior = createBehavior(BEHAVIOR_PRESETS.stationary(), "idle");
    stepBehavior(entity, behavior, 1, world);
    expect(entity.x).toBe(5);
    expect(entity.vx).toBe(0);
  });
});

describe("patrol preset", () => {
  it("walks right from its origin until reaching range, then turns around", () => {
    const world = createWorld();
    const entity = spawn(world, { x: 0, vx: 0 });
    const behavior = createBehavior(BEHAVIOR_PRESETS.patrol({ range: 10, speed: 100 }), "right");

    stepBehavior(entity, behavior, 0, world); // records origin, sets vx
    expect(entity.vx).toBe(100);
    expect(behavior.current).toBe("right");

    entity.x = 10; // simulate integrateSystem having moved it to the boundary
    stepBehavior(entity, behavior, 0, world); // "right"'s update still runs this tick; the crossing is what triggers the transition
    expect(behavior.current).toBe("left");
    expect(entity.vx).toBe(100);

    stepBehavior(entity, behavior, 0, world); // now in "left" — vx flips
    expect(entity.vx).toBe(-100);
  });

  it("turns around at the left boundary too", () => {
    const world = createWorld();
    const entity = spawn(world, { x: 0, vx: 0 });
    const behavior = createBehavior(BEHAVIOR_PRESETS.patrol({ range: 10, speed: 50 }), "left");
    stepBehavior(entity, behavior, 0, world);
    entity.x = -10;
    stepBehavior(entity, behavior, 0, world);
    expect(behavior.current).toBe("right");
    expect(entity.vx).toBe(-50);

    stepBehavior(entity, behavior, 0, world);
    expect(entity.vx).toBe(50);
  });
});

describe("chase preset", () => {
  it("steers toward a player-tagged entity to the right", () => {
    const world = createWorld();
    spawn(world, { player: true, x: 100 });
    const entity = spawn(world, { x: 0, vx: 0 });
    const behavior = createBehavior(BEHAVIOR_PRESETS.chase({ speed: 75 }), "chasing");
    stepBehavior(entity, behavior, 0.1, world);
    expect(entity.vx).toBe(75);
  });

  it("steers toward a player-tagged entity to the left", () => {
    const world = createWorld();
    spawn(world, { player: true, x: -100 });
    const entity = spawn(world, { x: 0, vx: 0 });
    const behavior = createBehavior(BEHAVIOR_PRESETS.chase({ speed: 75 }), "chasing");
    stepBehavior(entity, behavior, 0.1, world);
    expect(entity.vx).toBe(-75);
  });

  it("stays put when no player-tagged entity exists", () => {
    const world = createWorld();
    const entity = spawn(world, { x: 0, vx: 0 });
    const behavior = createBehavior(BEHAVIOR_PRESETS.chase({ speed: 75 }), "chasing");
    stepBehavior(entity, behavior, 0.1, world);
    expect(entity.vx).toBe(0);
  });
});
