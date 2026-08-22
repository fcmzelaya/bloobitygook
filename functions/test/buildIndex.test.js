import { describe, it, expect } from "vitest";
import { buildGamesIndex } from "../buildIndex.js";

const manifest = (fields) => JSON.stringify({ id: "a", title: "A", route: "/a/", published: true, ...fields });

describe("buildGamesIndex", () => {
  it("parses every raw manifest text into the games array", () => {
    const result = buildGamesIndex([manifest({ id: "tetris" }), manifest({ id: "pacman" })]);
    expect(result.games.map((g) => g.id)).toEqual(["tetris", "pacman"]);
  });

  it("skips an unreadable/malformed manifest without failing the whole rebuild", () => {
    const result = buildGamesIndex([manifest({ id: "tetris" }), "not valid json{{{", manifest({ id: "pacman" })]);
    expect(result.games.map((g) => g.id)).toEqual(["tetris", "pacman"]);
  });

  it("skips a manifest that read back as the literal null", () => {
    const result = buildGamesIndex([manifest({ id: "tetris" }), "null"]);
    expect(result.games.map((g) => g.id)).toEqual(["tetris"]);
  });

  it("stamps generatedAt from the given clock", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = buildGamesIndex([], now);
    expect(result.generatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns an empty games array when there are no manifests at all", () => {
    expect(buildGamesIndex([]).games).toEqual([]);
  });
});
