import { spawn } from "../world.js";
import { createSvgElement } from "../svg.js";

// `def` is the same shape a scene JSON object uses — spawning from code
// and spawning from a loaded file go through the exact same function.
export function spawnBall(world, worldEl, def) {
  const {
    x, y,
    vx = 0, vy = 0,
    radius = 30,
    color = "#5ec8c0",
    restitution = 0.72,
    friction = 0.25,
  } = def;

  const circleEl = createSvgElement("circle", { r: radius, fill: color });
  const el = createSvgElement("g");
  el.appendChild(circleEl);
  worldEl.appendChild(el);

  return spawn(world, {
    entityType: "ball",
    dynamic: true,
    x, y, vx, vy,
    radius, color, restitution, friction,
    scaleX: 1, scaleY: 1, scaleVelX: 0, scaleVelY: 0,
    el, circleEl,
  });
}

// Paired with spawnBall — same field list scene.js used to hardcode
// inline, moved here so it lives next to the entity shape it describes.
export function serializeBall(entity) {
  return {
    x: round(entity.x),
    y: round(entity.y),
    vx: round(entity.vx ?? 0),
    vy: round(entity.vy ?? 0),
    radius: entity.radius,
    color: entity.color,
    restitution: entity.restitution,
    friction: entity.friction,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
