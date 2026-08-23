import { describe, it, expect, vi } from "vitest";
import { runStage } from "../src/runStage.js";

describe("runStage", () => {
  it("calls every configured system with (world, dt, config)", () => {
    const fn = vi.fn();
    const world = {};
    const config = { direction: { dcol: 0, drow: 1 } };
    runStage({ systems: [{ fn, config }] }, world, 16);
    expect(fn).toHaveBeenCalledWith(world, 16, config);
  });

  it("calls only the systems a stage actually lists, in order", () => {
    const order = [];
    const stage = {
      systems: [
        { fn: () => order.push("a"), config: undefined },
        { fn: () => order.push("b"), config: undefined },
      ],
    };
    runStage(stage, {}, 16);
    expect(order).toEqual(["a", "b"]);
  });

  it("does nothing for a stage with no systems", () => {
    expect(() => runStage({ systems: [] }, {}, 16)).not.toThrow();
  });
});
