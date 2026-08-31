import { createCatalog } from "./catalog.js";
import { STANDARD_DEFINITIONS, STANDARD_CATALOG } from "./standard.js";
import { archetypeToDefinition, resolveArchetype } from "./archetype.js";
import { loadScene, catalogIdsOf } from "./scene.js";

// Shared by every "load a scene file into a live world" consumer
// (apps/editor's engine.js, apps/scene-player) — a scene's catalogIds can
// name user-authored archetypes the built-in STANDARD_CATALOG doesn't
// know, and those archetypes can themselves extend other archetypes not
// listed in the scene at all, so both need fetching before the scene can
// actually load.
//
// `fetchArchetype` is injected, not imported — keeps this package
// Firebase-free, the same pattern packages/triggers/zone.js already uses
// for `entityFilter`. It's called at most once per distinct id even
// across the ids-and-their-ancestors walk below (a `byId` Map keyed as
// records come in), and a missing/offline archetype is simply left out —
// loadScene's own "unknown type — skipped" warning already handles a
// scene referencing a type the resulting catalog doesn't have.
async function fetchArchetypesTransitively(rootIds, fetchArchetype) {
  const byId = new Map();
  let frontier = rootIds;

  while (frontier.length > 0) {
    const fetched = await Promise.all(
      frontier.map(async (id) => {
        if (byId.has(id)) return null;
        const record = await fetchArchetype(id);
        return record ? [id, record] : null;
      })
    );

    const newFrontier = [];
    for (const entry of fetched) {
      if (!entry) continue;
      const [id, record] = entry;
      byId.set(id, record);
      if (record.extends && !byId.has(record.extends)) newFrontier.push(record.extends);
    }
    frontier = newFrontier;
  }

  return byId;
}

// { sceneData, world, worldEl, fetchArchetype } -> { gravity, catalog }.
// `fetchArchetype` is optional — omit it (or leave every id known to
// STANDARD_CATALOG) to skip the async archetype fetch entirely.
export async function loadSceneWithArchetypes({ sceneData, world, worldEl, fetchArchetype }) {
  const ids = catalogIdsOf(sceneData);
  const unknownIds = ids.filter((id) => !STANDARD_CATALOG.byId(id));

  const archetypesById =
    fetchArchetype && unknownIds.length > 0
      ? await fetchArchetypesTransitively(unknownIds, fetchArchetype)
      : new Map();

  const resolvedDefinitions = unknownIds
    .map((id) => archetypesById.get(id))
    .filter(Boolean)
    .map((archetype) => archetypeToDefinition(resolveArchetype(archetype, archetypesById)));

  const catalog = createCatalog([...STANDARD_DEFINITIONS, ...resolvedDefinitions]).enabledIn(ids);
  const gravity = loadScene(world, worldEl, sceneData, catalog);
  return { gravity, catalog };
}
