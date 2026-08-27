// The single place that turns a catalog id into a live entity (and back).
// Every entity gets a `catalogId` stamp at spawn time regardless of who
// calls this (scene.js loading a file, or the editor placing one live) —
// that stamp is what makes serialization uniform even though several
// definitions can share one underlying entityType (all 7 Tetris piece
// definitions spawn a "cellGroup" entity; only `catalogId` tells them
// apart afterward).
export function instantiateObject(catalog, id, world, worldEl, def) {
  const definition = catalog.byId(id);
  if (!definition) throw new Error(`Unknown catalog id "${id}"`);
  const entity = definition.spawn(world, worldEl, def);
  entity.catalogId = id;
  return entity;
}

export function serializeObject(catalog, entity) {
  const definition = catalog.byId(entity.catalogId);
  if (!definition) throw new Error(`Unknown catalog id "${entity.catalogId}" on entity`);
  return { type: entity.catalogId, ...definition.serialize(entity) };
}
