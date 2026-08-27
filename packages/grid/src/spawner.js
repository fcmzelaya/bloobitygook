// Generic candidate-selection + lookahead — nothing here knows "piece" is
// a Tetris concept; `candidates` could just as easily be enemy or item
// types for a different game. Each strategy is a factory returning a
// stateful pick() closure specific to one spawner instance, so a future
// stateful strategy (e.g. a shuffled-bag algorithm that must not repeat
// within a cycle) is a new entry here, not a redesign of createSpawner.
const PICK_STRATEGIES = {
  random: (candidates) => () => candidates[Math.floor(Math.random() * candidates.length)],
};

// Names a caller can offer in a strategy picker (e.g. the editor's spawner
// Inspector) without hardcoding "random" as a magic string of its own.
export const SPAWNER_STRATEGIES = Object.keys(PICK_STRATEGIES);

export function createSpawner({ candidates, strategy = "random" }) {
  const factory = PICK_STRATEGIES[strategy];
  if (!factory) throw new Error(`Unknown spawner strategy "${strategy}"`);
  if (!candidates || candidates.length === 0) throw new Error("createSpawner needs at least one candidate");
  const pick = factory(candidates);
  // Always 2 buffered: queue[0] is what peek() shows and the next next()
  // call returns; queue[1] is refilled immediately so peek() never sees
  // an empty slot.
  let queue = [pick(), pick()];

  return {
    next() {
      const item = queue.shift();
      queue.push(pick());
      return item;
    },
    peek() {
      return queue[0];
    },
  };
}
