// Continuous-physics platformer movement, layered on top of
// packages/engine's existing gravity/collision/integrate systems rather
// than a separate kinematic character-controller — a held direction sets
// horizontal velocity directly, and a jump is only honored while
// `entity.grounded` (set by packages/engine's collisionSystem on floor
// contact) is true.

export function applyMoveInput(entity, direction, moveSpeed) {
  entity.vx = direction * moveSpeed;
}

// Returns whether the jump was actually applied, so a caller can react
// (e.g. play a sound only on a real jump, not a rejected one).
export function applyJump(entity, jumpImpulse) {
  if (!entity.grounded) return false;
  entity.vy = -jumpImpulse;
  entity.grounded = false; // guards a double-jump if called twice before the next collision pass
  return true;
}
