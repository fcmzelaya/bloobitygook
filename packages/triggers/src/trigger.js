// A trigger is a condition->action pair: `condition(world)` returns the
// list of things that matched (empty/falsy if nothing did), and `action`
// runs once per tick where something matched. Deliberately generic —
// this is what a Tetris row-clear (condition: which rows are full) and a
// Pac-Man portal (condition: which entities are inside this zone) both
// turn out to be, once you strip away what's specific to each.
export function createTrigger({ condition, action }) {
  return { condition, action };
}

// Returns the triggers that actually fired this call, each paired with
// its matches — callers that need to know *what* happened (e.g. Tetris
// scoring off how many rows cleared) read this instead of re-deriving it.
export function runTriggers(world, triggers) {
  const fired = [];
  for (const trigger of triggers) {
    const matches = trigger.condition(world);
    if (matches && matches.length > 0) {
      trigger.action(world, matches);
      fired.push({ trigger, matches });
    }
  }
  return fired;
}
