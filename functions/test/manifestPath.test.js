import { describe, it, expect } from "vitest";
import { isManifestPath } from "../manifestPath.js";

describe("isManifestPath", () => {
  it("matches a game's manifest.json", () => {
    expect(isManifestPath("games/tetris/manifest.json")).toBe(true);
    expect(isManifestPath("games/pac-man/manifest.json")).toBe(true);
  });

  it("does not match the aggregate index itself — the function must not re-trigger on its own output", () => {
    expect(isManifestPath("games/index.json")).toBe(false);
  });

  it("does not match drafts, scenes, or unrelated paths", () => {
    expect(isManifestPath("drafts/games/tetris/manifest.json")).toBe(false);
    expect(isManifestPath("scenes/some-scene.json")).toBe(false);
    expect(isManifestPath("games/tetris/thumbnail.png")).toBe(false);
  });

  it("does not match a nested path beyond one id segment", () => {
    expect(isManifestPath("games/tetris/nested/manifest.json")).toBe(false);
  });
});
