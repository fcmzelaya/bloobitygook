import { describe, it, expect } from "vitest";
import { createBehavior, stepBehavior } from "../src/stateMachine.js";
import { BEHAVIOR_PRESETS } from "../src/presets.js";

describe("patrolKinematic preset", () => {
  it("mutates entity.x directly, moving right from its recorded origin", () => {
    const states = BEHAVIOR_PRESETS.patrolKinematic({ range: 10, speed: 5 });
    const behavior = createBehavior(states, "right");
    const entity = { x: 0, behavior };

    stepBehavior(entity, behavior, 1, {});
    expect(entity.x).toBe(5);
    expect(entity.patrolOrigin).toBe(0);
  });

  it("switches direction at the range boundary and comes back", () => {
    const states = BEHAVIOR_PRESETS.patrolKinematic({ range: 10, speed: 5 });
    const behavior = createBehavior(states, "right");
    const entity = { x: 0, behavior };

    stepBehavior(entity, behavior, 3, {}); // x -> 15, past origin(0)+range(10) -> switches to left
    expect(behavior.current).toBe("left");

    stepBehavior(entity, behavior, 1, {}); // now steps left
    expect(entity.x).toBe(10);
  });

  it("does not touch vx/vy — a non-dynamic entity's own fields stay untouched", () => {
    const states = BEHAVIOR_PRESETS.patrolKinematic({ range: 10, speed: 5 });
    const behavior = createBehavior(states, "right");
    const entity = { x: 0, vx: 999, vy: 999, dynamic: false, behavior };
    stepBehavior(entity, behavior, 1, {});
    expect(entity.vx).toBe(999);
    expect(entity.vy).toBe(999);
  });
});
