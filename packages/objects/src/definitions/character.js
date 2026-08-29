import { spawn, createSvgElement } from "@bloobitygook/engine/core";
import { createAnimation } from "@bloobitygook/animation";

// A character reuses the exact physics-entity shape spawnBall builds
// (dynamic circle body: x/y/vx/vy/radius/restitution/friction, plus the
// scaleX/Y spring fields deformationSystem drives) — but isn't spawnBall
// itself, since that hardcodes entityType:"ball". Two things a ball
// doesn't have: `animations` (a name-keyed map, so a second named
// animation — walk/jump — is a data addition later, not a shape change)
// and `stats` (an open bag: moveSpeed, jumpImpulse, health, whatever a
// game needs — arbitrary, no fixed schema, per the standing no-hardcoded
// -logic rule).
const DEFAULT_ANIMATIONS = { idle: { frames: [{}], fps: 1 } };

export function spawnCharacter(world, worldEl, def) {
  const {
    x, y,
    vx = 0, vy = 0,
    radius = 20,
    color = "#7ee08a",
    restitution = 0.5,
    friction = 0.3,
    animations = DEFAULT_ANIMATIONS,
    animation = Object.keys(animations)[0],
    stats = {},
  } = def;

  // `el` and `circleEl` are deliberately the same node, not a circle
  // wrapped in a group — renderSystem's transform (translate+scale) works
  // directly on a <circle>, and animationSystem's frame swaps always
  // target `entity.el` (see packages/animation), so a separate wrapper
  // would put those two systems' writes on different elements and the
  // frame swaps would silently do nothing.
  const circleEl = createSvgElement("circle", { r: radius, fill: color });
  const el = circleEl;
  worldEl.appendChild(el);

  const activeAnimation = animations[animation];
  if (!activeAnimation) throw new Error(`Unknown animation "${animation}" for this character`);

  return spawn(world, {
    entityType: "character",
    dynamic: true,
    x, y, vx, vy,
    radius, color, restitution, friction,
    scaleX: 1, scaleY: 1, scaleVelX: 0, scaleVelY: 0,
    el, circleEl,
    animations,
    animationName: animation,
    animation: createAnimation(activeAnimation.frames, activeAnimation.fps),
    stats: { ...stats },
  });
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export function serializeCharacter(entity) {
  return {
    x: round(entity.x),
    y: round(entity.y),
    vx: round(entity.vx ?? 0),
    vy: round(entity.vy ?? 0),
    radius: entity.radius,
    color: entity.color,
    restitution: entity.restitution,
    friction: entity.friction,
    animations: entity.animations,
    animation: entity.animationName,
    stats: { ...entity.stats },
  };
}

export const characterDefinition = {
  id: "blob",
  category: "character",
  label: "Blob",
  swatch: "#7ee08a",
  coordinateSpace: "pixel",
  spawn: spawnCharacter,
  serialize: serializeCharacter,
  buildSpawnDef(x, y) {
    return {
      x,
      y,
      radius: 20,
      color: "#7ee08a",
      restitution: 0.5,
      friction: 0.3,
      animations: DEFAULT_ANIMATIONS,
      animation: "idle",
      stats: { moveSpeed: 200, jumpImpulse: 500 },
    };
  },
};

export default characterDefinition;
