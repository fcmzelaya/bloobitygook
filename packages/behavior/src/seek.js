// Pure movement primitives over plain {x, y} points — work equally for
// grid coordinates or continuous pixels, since they're just numbers.
// "Chase" is seekToward(self, player); "scatter" is seekToward(self, a
// fixed corner); "flee" is fleeFrom(self, player) — the state machine in
// stateMachine.js just picks which of these (and which target) applies
// per state, this module doesn't know about any of that.

export function seekToward(position, target, speed, dt) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: position.x, y: position.y };
  const step = Math.min(speed * dt, dist); // clamp so it lands on, not past, the target
  return {
    x: position.x + (dx / dist) * step,
    y: position.y + (dy / dist) * step,
  };
}

export function fleeFrom(position, threat, speed, dt) {
  const dx = position.x - threat.x;
  const dy = position.y - threat.y;
  const dist = Math.hypot(dx, dy) || 1; // if exactly on top of the threat, pick an arbitrary direction
  return {
    x: position.x + (dx / dist) * speed * dt,
    y: position.y + (dy / dist) * speed * dt,
  };
}
