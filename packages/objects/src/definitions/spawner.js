import { spawn, createSvgElement } from "@bloobitygook/engine/core";

// A placeable marker, not a gameplay object — it holds config for which
// group of other catalog entries it can produce (category + allowed-types
// subset + a pick strategy, matching @bloobitygook/grid's createSpawner
// shape) so a future gameplay pass can read it and drive real spawning.
// Placing/editing it is all this pass does; nothing consumes it yet.
const MARKER_RADIUS = 14;

export function spawnSpawnerMarker(world, worldEl, def) {
  const { x, y, category = null, allowedTypes = [], strategy = "random" } = def;

  const el = createSvgElement("g");
  const diamond = createSvgElement("polygon", {
    points: `0,-${MARKER_RADIUS} ${MARKER_RADIUS},0 0,${MARKER_RADIUS} -${MARKER_RADIUS},0`,
    fill: "#e0d15e",
    stroke: "#8a8030",
    "stroke-width": 2,
  });
  el.appendChild(diamond);
  el.setAttribute("transform", `translate(${x} ${y})`);
  worldEl.appendChild(el);

  // `radius` lets the editor's generic circle hit-test select a spawner
  // the same way it selects a ball, with no spawner-specific hit-testing
  // code — it deliberately has no `dynamic`/`scaleX` fields, so none of
  // packages/engine's physics/render systems ever touch it.
  return spawn(world, {
    entityType: "spawner",
    x,
    y,
    radius: MARKER_RADIUS,
    category,
    allowedTypes,
    strategy,
    el,
    markerEl: diamond, // the shape the editor outlines on selection
  });
}

export function serializeSpawnerMarker(entity) {
  return { x: entity.x, y: entity.y, category: entity.category, allowedTypes: entity.allowedTypes, strategy: entity.strategy };
}

export const spawnerDefinition = {
  id: "spawner",
  category: "tool",
  label: "Spawner",
  swatch: "#e0d15e",
  coordinateSpace: "pixel",
  spawn: spawnSpawnerMarker,
  serialize: serializeSpawnerMarker,
  // Defaults a freshly-placed spawner to the catalog's first non-tool
  // category (with every type in it allowed) so it's usable immediately
  // instead of landing unconfigured — Inspector lets it be narrowed after.
  buildSpawnDef(x, y, catalog) {
    const category = catalog.all().find((d) => d.category !== "tool")?.category ?? null;
    const allowedTypes = category ? catalog.byCategory(category).map((d) => d.id) : [];
    return { x, y, category, allowedTypes, strategy: "random" };
  },
};
