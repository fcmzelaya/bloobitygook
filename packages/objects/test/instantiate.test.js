import { describe, it, expect } from "vitest";
import { createCatalog } from "../src/catalog.js";
import { instantiateObject, serializeObject } from "../src/instantiate.js";

// Two fake definitions sharing one entityType, the way every Tetris piece
// definition shares "cellGroup" — proves serialization can't rely on
// entityType alone and must go through the catalogId stamp instead.
function makeSharedTypeDefinition(id) {
  return {
    id,
    category: "piece",
    spawn: (world, worldEl, def) => ({ entityType: "cellGroup", col: def.col, row: def.row }),
    serialize: (entity) => ({ col: entity.col, row: entity.row }),
  };
}

const ballLikeDefinition = {
  id: "ball",
  category: "physics",
  spawn: (world, worldEl, def) => ({ entityType: "ball", x: def.x, y: def.y }),
  serialize: (entity) => ({ x: entity.x, y: entity.y }),
};

describe("instantiateObject", () => {
  it("spawns via the definition and stamps catalogId", () => {
    const catalog = createCatalog([ballLikeDefinition]);
    const entity = instantiateObject(catalog, "ball", null, null, { x: 1, y: 2 });
    expect(entity).toMatchObject({ entityType: "ball", x: 1, y: 2, catalogId: "ball" });
  });

  it("throws on an unknown catalog id", () => {
    const catalog = createCatalog([ballLikeDefinition]);
    expect(() => instantiateObject(catalog, "bogus", null, null, {})).toThrow(/Unknown catalog id/);
  });
});

describe("serializeObject", () => {
  it("round-trips a ball-shaped definition", () => {
    const catalog = createCatalog([ballLikeDefinition]);
    const entity = instantiateObject(catalog, "ball", null, null, { x: 5, y: 6 });
    expect(serializeObject(catalog, entity)).toEqual({ type: "ball", x: 5, y: 6 });
  });

  it("disambiguates two definitions that share an entityType", () => {
    const catalog = createCatalog([makeSharedTypeDefinition("o"), makeSharedTypeDefinition("j")]);
    const oEntity = instantiateObject(catalog, "o", null, null, { col: 1, row: 2 });
    const jEntity = instantiateObject(catalog, "j", null, null, { col: 3, row: 4 });

    expect(oEntity.entityType).toBe("cellGroup");
    expect(jEntity.entityType).toBe("cellGroup");
    expect(serializeObject(catalog, oEntity)).toEqual({ type: "o", col: 1, row: 2 });
    expect(serializeObject(catalog, jEntity)).toEqual({ type: "j", col: 3, row: 4 });
  });

  it("throws if the entity's catalogId isn't in the given catalog", () => {
    const catalog = createCatalog([ballLikeDefinition]);
    expect(() => serializeObject(catalog, { catalogId: "bogus" })).toThrow(/Unknown catalog id/);
  });
});
