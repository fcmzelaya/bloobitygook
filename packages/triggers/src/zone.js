// Rectangular spatial region — deliberately takes no dependency on the
// engine's world/query; callers inject their own entity-selection
// function (zoneEntryCondition's `entityFilter`), so this package stays
// usable by anything with an {x, y} point, not just ECS entities.
export function createZone(x, y, width, height) {
  return { x, y, width, height };
}

export function isInsideZone(zone, point) {
  return (
    point.x >= zone.x &&
    point.x <= zone.x + zone.width &&
    point.y >= zone.y &&
    point.y <= zone.y + zone.height
  );
}

// Ready-made trigger condition: whichever of `entityFilter(world)`'s
// results currently sit inside `zone`. Pair with an action (e.g.
// teleporting matches to a paired portal) via createTrigger.
export function zoneEntryCondition(zone, entityFilter) {
  return (world) => entityFilter(world).filter((entity) => isInsideZone(zone, entity));
}
