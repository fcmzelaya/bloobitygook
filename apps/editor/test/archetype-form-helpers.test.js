import { describe, it, expect } from "vitest";
import {
  emptyArchetype,
  inputMapToRows,
  rowsToInputMap,
  hasRequiredPropertyMissingDefault,
} from "../src/archetype-form-helpers.js";

describe("emptyArchetype", () => {
  it("starts static, with a shape visual and no properties", () => {
    const archetype = emptyArchetype("goblin");
    expect(archetype.id).toBe("goblin");
    expect(archetype.behavior).toEqual({ mode: "static" });
    expect(archetype.visual.kind).toBe("shape");
    expect(archetype.properties).toEqual([]);
  });
});

describe("inputMapToRows / rowsToInputMap", () => {
  it("round-trips a populated inputMap through rows and back", () => {
    const inputMap = {
      ArrowLeft: { onPress: "moveLeft", onRelease: "stopMoving" },
      " ": { onPress: "jump" },
    };
    const rows = inputMapToRows(inputMap);
    expect(rows).toEqual([
      { key: "ArrowLeft", onPress: "moveLeft", onRelease: "stopMoving" },
      { key: " ", onPress: "jump", onRelease: "" },
    ]);
    expect(rowsToInputMap(rows)).toEqual({
      ArrowLeft: { onPress: "moveLeft", onRelease: "stopMoving" },
      " ": { onPress: "jump", onRelease: undefined },
    });
  });

  it("handles an empty/missing inputMap", () => {
    expect(inputMapToRows(undefined)).toEqual([]);
    expect(rowsToInputMap([])).toEqual({});
  });

  it("drops a row with no key when converting back to a map", () => {
    const rows = [{ key: "", onPress: "jump", onRelease: "" }, { key: "w", onPress: "jump", onRelease: "" }];
    expect(rowsToInputMap(rows)).toEqual({ w: { onPress: "jump", onRelease: undefined } });
  });
});

describe("hasRequiredPropertyMissingDefault", () => {
  it("is false when every required property has a default", () => {
    expect(hasRequiredPropertyMissingDefault([{ name: "moveSpeed", default: 200, required: true }])).toBe(false);
  });

  it("is true when a required property's default is empty or null", () => {
    expect(hasRequiredPropertyMissingDefault([{ name: "moveSpeed", default: "", required: true }])).toBe(true);
    expect(hasRequiredPropertyMissingDefault([{ name: "moveSpeed", default: null, required: true }])).toBe(true);
  });

  it("ignores a missing default on a property that isn't required", () => {
    expect(hasRequiredPropertyMissingDefault([{ name: "health", default: "", required: false }])).toBe(false);
  });

  it("a default of 0 is not considered missing", () => {
    expect(hasRequiredPropertyMissingDefault([{ name: "health", default: 0, required: true }])).toBe(false);
  });
});
