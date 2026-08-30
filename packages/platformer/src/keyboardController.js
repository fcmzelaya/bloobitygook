import { ARCHETYPE_ACTIONS } from "./actions.js";

// Generalizes what apps/goop used to hand-wire per-app (a `held` Set of
// arrow keys + manual left/right reconciliation) into something
// data-driven: which key does what comes from `entity.inputMap` (set at
// spawn time from an archetype's `{mode:"input"}` behavior config), not
// hardcoded per app.
//
// Two opposing keys (e.g. both arrows) held at once need to reconcile
// when one releases — falling back to whichever is still held, not
// stopping outright. Rather than hardcoding which action names are
// "opposite" each other, this replays every currently-held key's
// onPress action in press order whenever the held set changes size
// without emptying — since actions like applyMoveInput overwrite `vx`
// wholesale, the most-recently-pressed still-held key's effect naturally
// wins, with no notion of "direction" baked in here.
export function createKeyboardController(entity, actions = ARCHETYPE_ACTIONS) {
  const held = new Set(); // insertion order = press order

  function runAction(name) {
    const action = actions[name];
    if (action) action(entity);
  }

  function replayHeld() {
    for (const key of held) {
      const binding = entity.inputMap?.[key];
      if (binding?.onPress) runAction(binding.onPress);
    }
  }

  return {
    handleKeyDown(key) {
      if (held.has(key)) return; // ignore OS key-repeat
      const binding = entity.inputMap?.[key];
      if (!binding) return;
      held.add(key);
      if (binding.onPress) runAction(binding.onPress);
    },
    handleKeyUp(key) {
      const binding = entity.inputMap?.[key];
      held.delete(key);
      if (!binding) return;
      if (held.size === 0) {
        if (binding.onRelease) runAction(binding.onRelease);
      } else {
        replayHeld();
      }
    },
  };
}
