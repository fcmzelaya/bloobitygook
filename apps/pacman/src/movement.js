// Tile-locked continuous movement, shared by the player and ghosts alike
// — the only difference between them is *who* sets `queuedDirection`
// (keyboard input vs. ghostAI.chooseDirection). An entity holds pixel
// {x, y}, a `direction` it's currently moving in (or null if stopped),
// and an optional `queuedDirection` it wants to turn onto next chance it
// gets.
export const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function currentCell(entity, cellSize) {
  return { col: Math.round(entity.x / cellSize), row: Math.round(entity.y / cellSize) };
}

export function isAtCellCenter(entity, cellSize, eps = 0.001) {
  const { col, row } = currentCell(entity, cellSize);
  return Math.abs(entity.x - col * cellSize) < eps && Math.abs(entity.y - row * cellSize) < eps;
}

// Tries to turn onto queuedDirection, or stops if the current direction
// is blocked. Only valid to call when the entity is exactly at a grid
// intersection (tryMove guarantees that).
function decide(entity, cellSize, isBlocked) {
  const col = Math.round(entity.x / cellSize);
  const row = Math.round(entity.y / cellSize);
  if (entity.queuedDirection) {
    const q = DIRECTIONS[entity.queuedDirection];
    if (!isBlocked(col + q.dx, row + q.dy)) entity.direction = entity.queuedDirection;
  }
  if (entity.direction) {
    const d = DIRECTIONS[entity.direction];
    if (isBlocked(col + d.dx, row + d.dy)) entity.direction = null;
  }
}

// The cell an entity moving in `direction` is heading toward. Uses
// floor/ceil (chosen by the direction's sign), not round — round is
// ambiguous once the entity is past its current cell's midpoint, which
// caused a real bug here: an entity moving right from x=5 (cellSize 100)
// would round to "nearest cell 0" forever, repeatedly "arriving" at the
// center it had already left, and never progress. Floor/ceil always
// picks the cell ahead in the direction of travel, unambiguously.
function targetCell(entity, direction, cellSize) {
  const d = DIRECTIONS[direction];
  const col =
    (d.dx > 0 ? Math.floor(entity.x / cellSize) : d.dx < 0 ? Math.ceil(entity.x / cellSize) : Math.round(entity.x / cellSize)) + d.dx;
  const row =
    (d.dy > 0 ? Math.floor(entity.y / cellSize) : d.dy < 0 ? Math.ceil(entity.y / cellSize) : Math.round(entity.y / cellSize)) + d.dy;
  return { col, row };
}

export function tryMove(entity, dt, isBlocked, cellSize) {
  let remaining = entity.speed * dt;

  if (isAtCellCenter(entity, cellSize)) {
    decide(entity, cellSize, isBlocked);
  }

  // A loop, not a single step: reaching a target with budget left over
  // means immediately re-deciding there (turn, continue, or stop) before
  // spending the rest — otherwise a turn or a wall stop would apply one
  // frame late, which (for the "stop" case) briefly pokes the entity
  // into the blocked cell before the *next* call catches it.
  while (entity.direction && remaining > 0) {
    const { col, row } = targetCell(entity, entity.direction, cellSize);
    const targetX = col * cellSize;
    const targetY = row * cellSize;
    const distToTarget = Math.hypot(targetX - entity.x, targetY - entity.y);

    if (distToTarget <= remaining) {
      entity.x = targetX;
      entity.y = targetY;
      remaining -= distToTarget;
      decide(entity, cellSize, isBlocked);
    } else {
      const d = DIRECTIONS[entity.direction];
      entity.x += d.dx * remaining;
      entity.y += d.dy * remaining;
      remaining = 0;
    }
  }
}
