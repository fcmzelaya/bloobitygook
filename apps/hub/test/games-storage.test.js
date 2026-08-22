import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { selectPublishedGames } from "../src/games-storage.js";

const valid = (overrides) => ({ id: "a", title: "A", route: "/a/", published: true, ...overrides });

describe("fetchAllManifests", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("degrades to an empty list on a 404 (function hasn't fired yet)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 404, ok: false });
    const { fetchAllManifests } = await import("../src/games-storage.js");
    expect(await fetchAllManifests()).toEqual([]);
  });

  it("fetches games/index.json and returns its games array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ games: [valid({ id: "a" })] }),
    });
    const { fetchAllManifests } = await import("../src/games-storage.js");
    const manifests = await fetchAllManifests();
    expect(manifests.map((m) => m.id)).toEqual(["a"]);
  });

  it("throws on a non-404 error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 500, ok: false });
    const { fetchAllManifests } = await import("../src/games-storage.js");
    await expect(fetchAllManifests()).rejects.toThrow(/500/);
  });
});

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
