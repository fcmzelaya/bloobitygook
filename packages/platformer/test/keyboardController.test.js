import { describe, it, expect, vi } from "vitest";
import { createKeyboardController } from "../src/keyboardController.js";
import { ARCHETYPE_ACTIONS } from "../src/actions.js";

const INPUT_MAP = {
  ArrowLeft: { onPress: "moveLeft", onRelease: "stopMoving" },
  ArrowRight: { onPress: "moveRight", onRelease: "stopMoving" },
  " ": { onPress: "jump" },
};

describe("createKeyboardController", () => {
  it("runs the mapped onPress action on keydown, and onRelease on keyup", () => {
    const calls = [];
    const actions = { moveLeft: () => calls.push("moveLeft"), stopMoving: () => calls.push("stopMoving") };
    const entity = { inputMap: INPUT_MAP };
    const controller = createKeyboardController(entity, actions);

    controller.handleKeyDown("ArrowLeft");
    expect(calls).toEqual(["moveLeft"]);
    controller.handleKeyUp("ArrowLeft");
    expect(calls).toEqual(["moveLeft", "stopMoving"]);
  });

  it("ignores a key with no binding in the entity's inputMap", () => {
    const calls = [];
    const actions = { moveLeft: () => calls.push("moveLeft") };
    const entity = { inputMap: INPUT_MAP };
    const controller = createKeyboardController(entity, actions);
    controller.handleKeyDown("q");
    expect(calls).toEqual([]);
  });

  it("ignores OS key-repeat (a second keydown for a key already held)", () => {
    const calls = [];
    const actions = { moveLeft: () => calls.push("moveLeft") };
    const entity = { inputMap: INPUT_MAP };
    const controller = createKeyboardController(entity, actions);
    controller.handleKeyDown("ArrowLeft");
    controller.handleKeyDown("ArrowLeft");
    controller.handleKeyDown("ArrowLeft");
    expect(calls).toEqual(["moveLeft"]);
  });

  it("falls back to the other held key's effect when one of two opposing keys releases", () => {
    const entity = { vx: 0, stats: { moveSpeed: 200 } };
    const controller = createKeyboardController(entity, ARCHETYPE_ACTIONS);
    entity.inputMap = INPUT_MAP;

    controller.handleKeyDown("ArrowLeft");
    expect(entity.vx).toBe(-200);

    controller.handleKeyDown("ArrowRight"); // both held — most recent wins
    expect(entity.vx).toBe(200);

    controller.handleKeyUp("ArrowRight"); // back to Left, still held
    expect(entity.vx).toBe(-200);

    controller.handleKeyUp("ArrowLeft"); // nothing held — stop
    expect(entity.vx).toBe(0);
  });

  it("a press-only action (jump) with no onRelease is a no-op on keyup", () => {
    const entity = { vy: 0, grounded: true, stats: { jumpImpulse: 400 }, inputMap: INPUT_MAP };
    const controller = createKeyboardController(entity, ARCHETYPE_ACTIONS);
    controller.handleKeyDown(" ");
    expect(entity.vy).toBe(-400);
    expect(() => controller.handleKeyUp(" ")).not.toThrow();
    expect(entity.vy).toBe(-400); // release didn't change anything
  });

  it("defaults to ARCHETYPE_ACTIONS when no action registry is given", () => {
    const entity = { vx: 0, stats: { moveSpeed: 100 }, inputMap: INPUT_MAP };
    const controller = createKeyboardController(entity);
    controller.handleKeyDown("ArrowRight");
    expect(entity.vx).toBe(100);
  });
});
