import { query } from "./world.js";

// Semi-implicit (symplectic) Euler throughout: velocity is updated before
// position each step. It's one line more than naive Euler and meaningfully
// more stable for spring/bounce systems at a fixed-ish frame timestep.

export function gravitySystem(world, dt, gravity) {
  for (const e of query(world, ["dynamic", "vy"])) {
    e.vy += gravity * dt;
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

const IMPACT_REFERENCE_SPEED = 600; // px/s that maps to a full-strength squash
const IMPACT_KICK = 7; // scale-velocity units imparted at full-strength impact

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
