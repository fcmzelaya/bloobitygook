import { applyMoveInput, applyJump } from "./movement.js";

// A name-keyed registry (not a switch) so an input-driven archetype
// selects behavior by name — a new action is a new registry entry here,
// not a rewritten conditional, per the standing no-hardcoded-logic rule.
// Reads tunables from the entity's own `stats` bag (packages/objects'
// archetype system), so two archetypes sharing these actions can still
// move/jump completely differently.
export const ARCHETYPE_ACTIONS = {
  moveLeft: (entity) => applyMoveInput(entity, -1, entity.stats?.moveSpeed ?? 0),
  moveRight: (entity) => applyMoveInput(entity, 1, entity.stats?.moveSpeed ?? 0),
  stopMoving: (entity) => applyMoveInput(entity, 0, entity.stats?.moveSpeed ?? 0),
  jump: (entity) => applyJump(entity, entity.stats?.jumpImpulse ?? 0),
};
