import { query } from "@bloobitygook/engine/core";

// A small, name-keyed registry of ready-made behavior patterns an
// archetype can pick from ("script programmed") instead of writing a
// custom states config by hand — a new preset is a new registry entry,
// not a redesign, matching this codebase's existing {name: value}
// registries (packages/grid's PICK_STRATEGIES/collisionStrategies).
//
// patrol/chase move via `vx` rather than directly setting position (the
// way this package's own seekToward/fleeFrom do) — archetype-spawned
// entities are continuous-physics bodies where `vy` is owned by gravity
// and collision, not by behavior, so only steering the horizontal
// velocity keeps this compatible with packages/engine's physics systems
// instead of fighting them every tick.
export const BEHAVIOR_PRESETS = {
  stationary: () => ({
    idle: { update: () => {} },
  }),

  // Walks back and forth `range` px either side of wherever it started.
  // The origin is recorded lazily on first update (an entity field, not
  // a preset closure) since a preset has no visibility into where a
  // given instance was actually placed.
  patrol: ({ range = 80, speed = 100 } = {}) => ({
    right: {
      update: (entity) => {
        if (entity.patrolOrigin === undefined) entity.patrolOrigin = entity.x;
        entity.vx = speed;
      },
      next: (entity) => (entity.x >= entity.patrolOrigin + range ? "left" : null),
    },
    left: {
      update: (entity) => {
        if (entity.patrolOrigin === undefined) entity.patrolOrigin = entity.x;
        entity.vx = -speed;
      },
      next: (entity) => (entity.x <= entity.patrolOrigin - range ? "right" : null),
    },
  }),

  // Steers horizontally toward the nearest entity tagged `player: true` —
  // the convention an input-driven archetype instance gets stamped with
  // at spawn time (see packages/objects/src/archetype.js), mirroring
  // apps/pacman's existing `movable: true` tag idiom. Sits still if no
  // player-tagged entity exists yet.
  chase: ({ speed = 100 } = {}) => ({
    chasing: {
      update: (entity, dt, world) => {
        const target = query(world, ["player"])[0];
        entity.vx = !target ? 0 : target.x > entity.x ? speed : -speed;
      },
    },
  }),
};
