import { describe, it, expect } from "vitest";
import { createManifestEntry, isValidManifestEntry } from "../src/manifest.js";

describe("createManifestEntry", () => {
  it("fills in defaults for optional fields", () => {
    const entry = createManifestEntry({ id: "tetris", title: "Tetris", route: "/tetris/" });
    expect(entry.description).toBe("");
    expect(entry.thumbnail).toBeNull();
    expect(entry.published).toBe(false);
    expect(typeof entry.createdAt).toBe("string");
  });

  it("preserves explicitly provided optional fields", () => {
    const entry = createManifestEntry({
      id: "tetris", title: "Tetris", route: "/tetris/",
      description: "Classic falling blocks", published: true, createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(entry.description).toBe("Classic falling blocks");
    expect(entry.published).toBe(true);
    expect(entry.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("throws when a required field is missing", () => {
    expect(() => createManifestEntry({ title: "Tetris", route: "/tetris/" })).toThrow(/id/);
    expect(() => createManifestEntry({ id: "tetris", route: "/tetris/" })).toThrow(/title/);
    expect(() => createManifestEntry({ id: "tetris", title: "Tetris" })).toThrow(/route/);
  });
});

describe("isValidManifestEntry", () => {
  it("accepts an entry with all required fields", () => {
    expect(isValidManifestEntry({ id: "tetris", title: "Tetris", route: "/tetris/" })).toBe(true);
  });

  it("rejects null, non-objects, and entries missing a required field", () => {
    expect(isValidManifestEntry(null)).toBe(false);
    expect(isValidManifestEntry("tetris")).toBe(false);
    expect(isValidManifestEntry({ id: "tetris", title: "Tetris" })).toBe(false);
    expect(isValidManifestEntry({ id: "", title: "Tetris", route: "/tetris/" })).toBe(false);
  });
});
