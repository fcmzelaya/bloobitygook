import { createTrigger } from "./trigger.js";

// Generalizes "count how many things completed at once, name the tier" —
// Tetris's single/double/triple/tetris line-clear naming is the
// validating second use case for this pattern on top of createTrigger's
// base condition->action shape (after line-clear and Pac-Man's portals
// both already validated that base shape). `tierNames[0]` names a single
// match, `tierNames[1]` a double, and so on; a match count beyond the
// list's length reuses the last (highest) tier name rather than throwing,
// since "more than the biggest named tier" should still resolve to
// something sensible.
export function createTieredGoalTrigger({ condition, tierNames, onAchieve }) {
  return createTrigger({
    condition,
    action: (world, matches) => {
      const tier = tierNames[matches.length - 1] ?? tierNames[tierNames.length - 1];
      onAchieve(world, matches, tier);
    },
  });
}
