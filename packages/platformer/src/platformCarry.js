import { query } from "@bloobitygook/engine/core";

// Everything in packages/engine's physics is circle collision; a platform
// is naturally a rect. Generalizing collisionSystem to rect-vs-circle
// would be a real physics-model change affecting every existing consumer
// (the blob demo included), so this is deliberately scoped to just the
// one case a moving platform actually needs: carrying a circle-radius
// rider that's standing on top of it. A future "pushed sideways" or
// "standing on a slope" need would require a real rect-collision pass —
// not attempted here.
//
// Position delta is tracked via lazily-initialized prevX/prevY, the same
// idiom packages/behavior's `patrol` preset already uses for its origin.
export function platformCarrySystem(world) {
  const platforms = query(world, ["platformSize", "x", "y"]);
  if (platforms.length === 0) return;

  const riders = query(world, ["x", "y", "radius"]);

  for (const platform of platforms) {
    const dx = platform.prevX === undefined ? 0 : platform.x - platform.prevX;
    const dy = platform.prevY === undefined ? 0 : platform.y - platform.prevY;
    platform.prevX = platform.x;
    platform.prevY = platform.y;

    const top = platform.y - platform.platformSize.height / 2;
    const left = platform.x - platform.platformSize.width / 2;
    const right = platform.x + platform.platformSize.width / 2;

    for (const rider of riders) {
      if (rider === platform) continue;
      const overlapsHorizontally = rider.x + rider.radius > left && rider.x - rider.radius < right;
      // "Standing on top" means the rider's feet sit within a few pixels
      // of the platform's top edge — generous enough to survive one
      // frame's gravity drift, tight enough not to grab a rider that's
      // merely passing alongside.
      const feetY = rider.y + rider.radius;
      const standingOnTop = overlapsHorizontally && Math.abs(feetY - top) <= 4;

      if (standingOnTop) {
        rider.x += dx;
        rider.y += dy;
        rider.grounded = true;
      }
    }
  }
}
