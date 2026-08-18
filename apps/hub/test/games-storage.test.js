import { describe, it, expect } from "vitest";
import { selectPublishedGames } from "../src/games-storage.js";

const valid = (overrides) => ({ id: "a", title: "A", route: "/a/", published: true, ...overrides });

describe("selectPublishedGames", () => {
  it("filters out unpublished entries", () => {
    const games = [valid({ id: "a", title: "A", published: true }), valid({ id: "b", title: "B", published: false })];
    expect(selectPublishedGames(games).map((g) => g.id)).toEqual(["a"]);
  });

  it("filters out malformed entries", () => {
    const games = [valid({ id: "a", title: "A" }), { title: "no id or route" }, null];
    expect(selectPublishedGames(games).map((g) => g.id)).toEqual(["a"]);
  });

  it("sorts alphabetically by title", () => {
    const games = [valid({ id: "z", title: "Zeta" }), valid({ id: "a", title: "Alpha" })];
    expect(selectPublishedGames(games).map((g) => g.id)).toEqual(["a", "z"]);
  });
});
