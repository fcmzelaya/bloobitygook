import { describe, it, expect, vi } from "vitest";
import { createTrigger, runTriggers } from "../src/trigger.js";

describe("runTriggers", () => {
  it("runs the action and reports it as fired when the condition matches something", () => {
    const action = vi.fn();
    const trigger = createTrigger({ condition: () => [1, 2], action });
    const fired = runTriggers({}, [trigger]);

    expect(action).toHaveBeenCalledWith({}, [1, 2]);
    expect(fired).toEqual([{ trigger, matches: [1, 2] }]);
  });

  it("does not run the action when the condition matches nothing", () => {
    const action = vi.fn();
    const trigger = createTrigger({ condition: () => [], action });
    const fired = runTriggers({}, [trigger]);

    expect(action).not.toHaveBeenCalled();
    expect(fired).toEqual([]);
  });

  it("tolerates a condition returning null/undefined instead of an empty array", () => {
    const action = vi.fn();
    const trigger = createTrigger({ condition: () => null, action });
    expect(() => runTriggers({}, [trigger])).not.toThrow();
    expect(action).not.toHaveBeenCalled();
  });

  it("evaluates every trigger independently, in order", () => {
    const order = [];
    const a = createTrigger({ condition: () => [1], action: () => order.push("a") });
    const b = createTrigger({ condition: () => [], action: () => order.push("b") });
    const c = createTrigger({ condition: () => [1], action: () => order.push("c") });

    runTriggers({}, [a, b, c]);

    expect(order).toEqual(["a", "c"]);
  });
});
