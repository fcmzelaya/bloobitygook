import { query } from "@bloobitygook/engine";

// entity.behavior = { states: { name: { update?, next? } }, current: "name" }
// `update(entity, dt, world)` runs every tick the entity is in that state.
// `next(entity, world)` returns the name of the state to transition to, or
// a falsy value to stay. Deliberately generic — "chase"/"scatter"/"flee"
// are just state *names* a game picks, not anything this package knows
// about; see seek.js for the movement primitives such states would use.
export function createBehavior(states, initial) {
  if (!states[initial]) {
    throw new Error(`createBehavior: unknown initial state "${initial}"`);
  }
  return { states, current: initial };
}

// Pure-ish step function (still calls into the entity/world since state
// callbacks act on them), separated from the ECS query loop below so
// transition logic is testable without a real ECS world.
export function stepBehavior(entity, behavior, dt, world) {
  const state = behavior.states[behavior.current];
  if (state.update) state.update(entity, dt, world);
  if (state.next) {
    const nextName = state.next(entity, world);
    if (nextName && nextName !== behavior.current) {
      if (!behavior.states[nextName]) {
        throw new Error(`Behavior tried to transition to unknown state "${nextName}"`);
      }
      behavior.current = nextName;
    }
  }
}

export function behaviorSystem(world, dt) {
  for (const e of query(world, ["behavior"])) {
    stepBehavior(e, e.behavior, dt, world);
  }
}
