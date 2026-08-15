import { query } from "./world.js";

// Semi-implicit (symplectic) Euler throughout: velocity is updated before
// position each step. It's one line more than naive Euler and meaningfully
// more stable for spring/bounce systems at a fixed-ish frame timestep.

// `gravity` is { mode: "uniform" | "point", magnitude, x, y }. Point mode
// pulls toward (x, y) at a constant magnitude (not inverse-square) — that
// keeps the same slider comparable across modes instead of needing a
// separate unit/scale for "point strength" vs. "earth strength".
export function gravitySystem(world, dt, gravity) {
  if (gravity.mode === "point") {
    for (const e of query(world, ["dynamic", "x", "y", "vx", "vy"])) {
      const dx = gravity.x - e.x;
      const dy = gravity.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.vx += (dx / dist) * gravity.magnitude * dt;
      e.vy += (dy / dist) * gravity.magnitude * dt;
    }
  } else {
    for (const e of query(world, ["dynamic", "vy"])) {
      e.vy += gravity.magnitude * dt;
    }
  }
}

export function integrateSystem(world, dt) {
  for (const e of query(world, ["dynamic", "x", "y", "vx", "vy"])) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
}

// Resolves collisions against the stage's floor and side walls: pushes the
// entity back inside bounds, reflects velocity along the collision normal
// scaled by restitution (elasticity), damps the tangential velocity by
// friction, and hands off to the deformation spring for the visual squash.
export function collisionSystem(world, bounds) {
  for (const e of query(world, ["dynamic", "x", "y", "vx", "vy", "radius"])) {
    const restitution = e.restitution ?? 0.7;
    const friction = e.friction ?? 0.2;

    if (e.y + e.radius > bounds.floorY) {
      e.y = bounds.floorY - e.radius;
      const impact = Math.abs(e.vy);
      e.vy = -e.vy * restitution;
      e.vx *= 1 - friction;
      applyImpact(e, impact, "y");
    }

    if (e.x - e.radius < bounds.left) {
      e.x = bounds.left + e.radius;
      const impact = Math.abs(e.vx);
      e.vx = -e.vx * restitution;
      e.vy *= 1 - friction;
      applyImpact(e, impact, "x");
    } else if (e.x + e.radius > bounds.right) {
      e.x = bounds.right - e.radius;
      const impact = Math.abs(e.vx);
      e.vx = -e.vx * restitution;
      e.vy *= 1 - friction;
      applyImpact(e, impact, "x");
    }
  }
}

// Ball-vs-ball collisions, broad-phased with a uniform grid instead of a
// naive O(n^2) pairwise scan. Cell size tracks the largest ball on scene
// so any pair that could possibly touch lands in the same or an adjacent
// cell — a quadtree would be overkill at the ball counts this demo sees.
export function ballCollisionSystem(world) {
  const entities = query(world, ["dynamic", "x", "y", "vx", "vy", "radius"]);
  if (entities.length < 2) return;

  let maxRadius = 0;
  for (const e of entities) if (e.radius > maxRadius) maxRadius = e.radius;
  const cellSize = Math.max(maxRadius * 2, 32);

  const grid = new Map();
  for (const e of entities) {
    const key = `${Math.floor(e.x / cellSize)},${Math.floor(e.y / cellSize)}`;
    let bucket = grid.get(key);
    if (!bucket) grid.set(key, (bucket = []));
    bucket.push(e);
  }

  const checked = new Set();
  for (const e of entities) {
    const cx = Math.floor(e.x / cellSize);
    const cy = Math.floor(e.y / cellSize);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const neighbors = grid.get(`${cx + ox},${cy + oy}`);
        if (!neighbors) continue;
        for (const other of neighbors) {
          if (other === e) continue;
          const pairKey = e.id < other.id ? `${e.id}:${other.id}` : `${other.id}:${e.id}`;
          if (checked.has(pairKey)) continue;
          checked.add(pairKey);
          resolveBallPair(e, other);
        }
      }
    }
  }
}

function resolveBallPair(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist === 0 || dist >= minDist) return; // not touching (or exactly coincident — ignore)

  const nx = dx / dist;
  const ny = dy / dist;

  // Mass proxy from area (radius^2, uniform density) — bigger balls push
  // smaller ones around instead of everything being weightless.
  const massA = a.radius * a.radius;
  const massB = b.radius * b.radius;
  const totalMass = massA + massB;

  // Positional correction so overlapping balls don't sink into each other.
  const overlap = minDist - dist;
  a.x -= nx * overlap * (massB / totalMass);
  a.y -= ny * overlap * (massB / totalMass);
  b.x += nx * overlap * (massA / totalMass);
  b.y += ny * overlap * (massA / totalMass);

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return; // already separating, no impulse needed

  const restitution = ((a.restitution ?? 0.7) + (b.restitution ?? 0.7)) / 2;
  const j = (-(1 + restitution) * velAlongNormal) / (1 / massA + 1 / massB);
  a.vx -= (j * nx) / massA;
  a.vy -= (j * ny) / massA;
  b.vx += (j * nx) / massB;
  b.vy += (j * ny) / massB;

  // Tangential friction bleeds off sliding velocity along the contact.
  const friction = ((a.friction ?? 0.2) + (b.friction ?? 0.2)) / 2;
  const tx = -ny, ty = nx;
  const relTangent = rvx * tx + rvy * ty;
  const frictionImpulse = relTangent * friction * 0.5;
  a.vx += tx * frictionImpulse;
  a.vy += ty * frictionImpulse;
  b.vx -= tx * frictionImpulse;
  b.vy -= ty * frictionImpulse;

  const impactSpeed = Math.abs(velAlongNormal);
  applyIsotropicImpact(a, impactSpeed);
  applyIsotropicImpact(b, impactSpeed);
}

const IMPACT_REFERENCE_SPEED = 600; // px/s that maps to a full-strength squash
const IMPACT_KICK = 7; // scale-velocity units imparted at full-strength impact

// Uniform shrink pulse for ball-ball hits — cheaper than the directional
// squash below since the impact normal is arbitrary, not axis-aligned.
function applyIsotropicImpact(entity, impactSpeed) {
  if (!("scaleVelX" in entity)) return;
  const kick = Math.min(impactSpeed / IMPACT_REFERENCE_SPEED, 1) * IMPACT_KICK * 0.5;
  entity.scaleVelX -= kick;
  entity.scaleVelY -= kick;
}

function applyImpact(entity, impactSpeed, axis) {
  if (!("scaleVelX" in entity)) return;
  const kick = Math.min(impactSpeed / IMPACT_REFERENCE_SPEED, 1) * IMPACT_KICK;
  if (axis === "y") {
    entity.scaleVelY -= kick; // compress along the impact normal
    entity.scaleVelX += kick * 0.6; // bulge the tangent (volume-ish preserved)
  } else {
    entity.scaleVelX -= kick;
    entity.scaleVelY += kick * 0.6;
  }
}

// Critically-damped-ish spring pulling scaleX/scaleY back toward 1 (round).
// Impacts inject velocity into scaleVelX/scaleVelY (see applyImpact above);
// this system is what turns that impulse into a settling squash-and-bounce
// instead of an instant snap.
const SPRING_STIFFNESS = 120;
const SPRING_DAMPING = 12;

export function deformationSystem(world, dt) {
  for (const e of query(world, ["scaleX", "scaleY", "scaleVelX", "scaleVelY"])) {
    const forceX = (1 - e.scaleX) * SPRING_STIFFNESS - e.scaleVelX * SPRING_DAMPING;
    const forceY = (1 - e.scaleY) * SPRING_STIFFNESS - e.scaleVelY * SPRING_DAMPING;

    e.scaleVelX += forceX * dt;
    e.scaleVelY += forceY * dt;
    e.scaleX += e.scaleVelX * dt;
    e.scaleY += e.scaleVelY * dt;
  }
}

// Syncs entity state to its SVG element. The only system that touches the
// DOM — every other system here just mutates plain data.
export function renderSystem(world) {
  for (const e of query(world, ["el", "x", "y", "scaleX", "scaleY"])) {
    e.el.setAttribute("transform", `translate(${e.x} ${e.y}) scale(${e.scaleX} ${e.scaleY})`);
  }
}
