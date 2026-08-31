import { describe, it, expect } from "vitest";
import { createWorld } from "@bloobitygook/engine/core";
import { loadSceneWithArchetypes } from "../src/sceneLoader.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const makeWorldEl = () => document.createElementNS(SVG_NS, "g");

const GOBLIN = {
  id: "goblin",
  label: "Goblin",
  category: "character",
  swatch: "#7ee08a",
  boundingRadius: 20,
  physics: { restitution: 0.3, friction: 0.4 },
  properties: [{ name: "moveSpeed", default: 150, required: true }],
  visual: { kind: "shape", shape: "circle", fill: "#7ee08a" },
  behavior: { mode: "static" },
};

function fakeFetcher(records) {
  return async (id) => records[id] ?? null;
}

describe("loadSceneWithArchetypes", () => {
  it("loads a scene using only built-ins when no fetchArchetype is given", async () => {
    const world = createWorld();
    const sceneData = { objects: [{ type: "ball", x: 1, y: 2 }], catalogIds: ["ball"] };
    const { gravity, catalog } = await loadSceneWithArchetypes({ sceneData, world, worldEl: makeWorldEl() });
    expect(gravity).toBeDefined();
    expect(catalog.byId("ball")).not.toBeNull();
    expect(world.entities).toHaveLength(1);
  });

  it("fetches and spawns an unknown archetype id via the injected fetcher", async () => {
    const world = createWorld();
    const worldEl = makeWorldEl();
    const sceneData = {
      objects: [{ type: "goblin", x: 5, y: 5, stats: {} }],
      catalogIds: ["goblin"],
    };
    const { catalog } = await loadSceneWithArchetypes({
      sceneData,
      world,
      worldEl,
      fetchArchetype: fakeFetcher({ goblin: GOBLIN }),
    });
    expect(catalog.byId("goblin")).not.toBeNull();
    expect(world.entities).toHaveLength(1);
    expect(world.entities[0].catalogId).toBe("goblin");
  });

  it("resolves an archetype's inheritance chain, fetching ancestors not listed in the scene's own catalogIds", async () => {
    const world = createWorld();
    const base = { ...GOBLIN, id: "base-enemy", physics: { restitution: 0.1, friction: 0.1 } };
    const elite = { id: "goblin-elite", extends: "base-enemy", label: "Elite", category: "character", swatch: "#f00", boundingRadius: 24, physics: { restitution: 0.9 }, visual: { kind: "shape", shape: "circle", fill: "#f00" } };
    const sceneData = {
      objects: [{ type: "goblin-elite", x: 0, y: 0, stats: {} }],
      catalogIds: ["goblin-elite"], // base-enemy is NOT listed here
    };
    const { catalog } = await loadSceneWithArchetypes({
      sceneData,
      world,
      worldEl: makeWorldEl(),
      fetchArchetype: fakeFetcher({ "base-enemy": base, "goblin-elite": elite }),
    });
    expect(catalog.byId("goblin-elite")).not.toBeNull();
    expect(world.entities).toHaveLength(1);
    expect(world.entities[0].restitution).toBe(0.9); // child override
    expect(world.entities[0].friction).toBe(0.1); // inherited from base
  });

  it("skips an archetype id the fetcher can't find, without throwing", async () => {
    const world = createWorld();
    const sceneData = { objects: [{ type: "ghost", x: 0, y: 0 }], catalogIds: ["ghost"] };
    const { catalog } = await loadSceneWithArchetypes({
      sceneData,
      world,
      worldEl: makeWorldEl(),
      fetchArchetype: fakeFetcher({}),
    });
    expect(catalog.byId("ghost")).toBeNull();
    expect(world.entities).toHaveLength(0);
  });
});
