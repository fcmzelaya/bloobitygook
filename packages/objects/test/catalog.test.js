import { describe, it, expect } from "vitest";
import { createCatalog } from "../src/catalog.js";

const DEFS = [
  { id: "a", category: "x", label: "A" },
  { id: "b", category: "x", label: "B" },
  { id: "c", category: "y", label: "C" },
];

describe("createCatalog", () => {
  it("looks up a definition by id", () => {
    const catalog = createCatalog(DEFS);
    expect(catalog.byId("b")).toBe(DEFS[1]);
  });

  it("returns null for an unknown id", () => {
    expect(createCatalog(DEFS).byId("nope")).toBeNull();
  });

  it("all() returns every definition", () => {
    expect(createCatalog(DEFS).all()).toEqual(DEFS);
  });

  it("byCategory() filters to matching definitions", () => {
    expect(createCatalog(DEFS).byCategory("x")).toEqual([DEFS[0], DEFS[1]]);
    expect(createCatalog(DEFS).byCategory("y")).toEqual([DEFS[2]]);
  });

  it("enabledIn() narrows to the given ids, same shape", () => {
    const narrowed = createCatalog(DEFS).enabledIn(["a", "c"]);
    expect(narrowed.all()).toEqual([DEFS[0], DEFS[2]]);
    expect(narrowed.byId("b")).toBeNull();
    expect(narrowed.byCategory("x")).toEqual([DEFS[0]]);
  });

  it("enabledIn() ignores ids that don't exist in the source catalog", () => {
    const narrowed = createCatalog(DEFS).enabledIn(["a", "bogus"]);
    expect(narrowed.all()).toEqual([DEFS[0]]);
  });
});
