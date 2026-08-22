import { describe, it, expect, vi } from "vitest";
import { createWorld, spawn } from "@bloobitygook/engine/core";
import { createBehavior, stepBehavior, behaviorSystem } from "../src/stateMachine.js";

describe("createBehavior", () => {
  it("throws for an unknown initial state", () => {
    expect(() => createBehavior({ idle: {} }, "chase")).toThrow(/unknown initial state/);
  });
});

describe("stepBehavior", () => {
  it("calls the current state's update every step", () => {
    const update = vi.fn();
    const behavior = createBehavior({ idle: { update } }, "idle");
    stepBehavior({ id: 1 }, behavior, 0.1, {});
    stepBehavior({ id: 1 }, behavior, 0.1, {});
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("transitions when next() returns a different known state", () => {
    const behavior = createBehavior(
      { idle: { next: () => "chase" }, chase: {} },
      "idle"
    );
    stepBehavior({}, behavior, 0.1, {});
    expect(behavior.current).toBe("chase");
  });

  it("stays put when next() returns a falsy value", () => {
    const behavior = createBehavior({ idle: { next: () => null } }, "idle");
    stepBehavior({}, behavior, 0.1, {});
    expect(behavior.current).toBe("idle");
  });

  it("stays put when next() returns the current state name", () => {
    const behavior = createBehavior({ idle: { next: () => "idle" } }, "idle");
    stepBehavior({}, behavior, 0.1, {});
    expect(behavior.current).toBe("idle");
  });

  it("throws transitioning to an unknown state, rather than silently getting stuck", () => {
    const behavior = createBehavior({ idle: { next: () => "nowhere" } }, "idle");
    expect(() => stepBehavior({}, behavior, 0.1, {})).toThrow(/unknown state/);
  });
});

describe("behaviorSystem", () => {
  it("steps every entity with a behavior component", () => {
    const world = createWorld();
    const update = vi.fn();
    spawn(world, { behavior: createBehavior({ idle: { update } }, "idle") });
    spawn(world, { behavior: createBehavior({ idle: { update } }, "idle") });
    spawn(world, { notBehavior: true });

    behaviorSystem(world, 0.1);

    expect(update).toHaveBeenCalledTimes(2);
  });
});
