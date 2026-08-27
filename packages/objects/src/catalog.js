// A catalog is just a lookup over a flat list of object definitions (see
// definitions/*.js for the shape). `enabledIn` is what lets a single game
// declare "which of these I actually use" — it returns a same-shaped
// catalog filtered to that subset, so callers never branch on whether
// they're holding the full catalog or a game's narrowed one.
export function createCatalog(definitions) {
  const byIdMap = new Map(definitions.map((d) => [d.id, d]));

  return {
    byId(id) {
      return byIdMap.get(id) ?? null;
    },
    all() {
      return definitions;
    },
    byCategory(category) {
      return definitions.filter((d) => d.category === category);
    },
    enabledIn(ids) {
      const idSet = new Set(ids);
      return createCatalog(definitions.filter((d) => idSet.has(d.id)));
    },
  };
}
