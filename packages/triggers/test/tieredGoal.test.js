import { describe, it, expect, vi } from "vitest";
import { runTriggers } from "../src/trigger.js";
import { createTieredGoalTrigger } from "../src/tieredGoal.js";

const TIER_NAMES = ["single", "double", "triple", "tetris"];

describe("createTieredGoalTrigger", () => {
  it("names the tier by how many things matched", () => {
    const onAchieve = vi.fn();
    const trigger = createTieredGoalTrigger({ condition: () => [1], tierNames: TIER_NAMES, onAchieve });
    runTriggers({}, [trigger]);
    expect(onAchieve).toHaveBeenCalledWith({}, [1], "single");
  });

  it("names a 4-match tier 'tetris'", () => {
    const onAchieve = vi.fn();
    const trigger = createTieredGoalTrigger({ condition: () => [1, 2, 3, 4], tierNames: TIER_NAMES, onAchieve });
    runTriggers({}, [trigger]);
    expect(onAchieve).toHaveBeenCalledWith({}, [1, 2, 3, 4], "tetris");
  });

  it("falls back to the highest named tier when matches exceed the tier list", () => {
    const onAchieve = vi.fn();
    const trigger = createTieredGoalTrigger({
      condition: () => [1, 2, 3, 4, 5],
      tierNames: TIER_NAMES,
      onAchieve,
    });
    runTriggers({}, [trigger]);
    expect(onAchieve).toHaveBeenCalledWith({}, [1, 2, 3, 4, 5], "tetris");
  });

  it("doesn't call onAchieve when nothing matched", () => {
    const onAchieve = vi.fn();
    const trigger = createTieredGoalTrigger({ condition: () => [], tierNames: TIER_NAMES, onAchieve });
    runTriggers({}, [trigger]);
    expect(onAchieve).not.toHaveBeenCalled();
  });
});
