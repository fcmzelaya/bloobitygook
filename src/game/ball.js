import { spawn } from "../engine/world.js";
import { createSvgElement } from "../engine/svg.js";

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
