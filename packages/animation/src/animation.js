import { query, setAttrs } from "@bloobitygook/engine";

// A "frame" is just a set of attributes to apply to an entity's element —
// swapping fill/shape/etc. over time, not loading image assets. Keeps
// animation consistent with how the rest of the engine renders (plain
// SVG attribute manipulation), no sprite-sheet machinery needed yet.
export function createAnimation(frames, fps) {
  if (!frames || frames.length === 0) {
    throw new Error("createAnimation needs at least one frame");
  }
  return { frames, fps, frame: 0, elapsed: 0 };
}

// Pure step function, separated from the ECS query loop below so it's
// testable without a real entity, world, or DOM element. Uses a while
// loop (not a single if) so a large dt — a dropped frame, a breakpoint —
// still lands on the correct frame instead of falling behind by one.
export function advanceAnimation(anim, dt, onFrameChange) {
  const frameDuration = 1 / anim.fps;
  anim.elapsed += dt;
  let changed = false;
  while (anim.elapsed >= frameDuration) {
    anim.elapsed -= frameDuration;
    anim.frame = (anim.frame + 1) % anim.frames.length;
    changed = true;
  }
  if (changed && onFrameChange) onFrameChange(anim.frames[anim.frame]);
  return anim;
}

export function animationSystem(world, dt) {
  for (const e of query(world, ["animation", "el"])) {
    advanceAnimation(e.animation, dt, (frame) => setAttrs(e.el, frame));
  }
}
