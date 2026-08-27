import { spawnBall, serializeBall, randomBallColor } from "@bloobitygook/engine/physics";

// The blob demo's one entity type, now expressed as a catalog definition
// instead of being hardcoded into scene.js/engine.js. `buildSpawnDef`
// reproduces exactly the randomization the editor used to inline in its
// click handler — moving it here means engine.js no longer needs to know
// "ball" is special.
export const ballDefinition = {
  id: "ball",
  category: "physics",
  label: "Ball",
  swatch: "#5ec8c0",
  coordinateSpace: "pixel",
  spawn: spawnBall,
  serialize: serializeBall,
  buildSpawnDef(x, y) {
    return {
      x,
      y,
      radius: 16 + Math.random() * 24,
      color: randomBallColor(),
      restitution: 0.5 + Math.random() * 0.4,
      friction: 0.1 + Math.random() * 0.3,
    };
  },
};
