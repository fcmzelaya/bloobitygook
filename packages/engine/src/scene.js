// Gravity is the one piece of scene state that's genuinely a physics
// concept rather than an object-catalog one, so it stays here even though
// the rest of scene load/save (which now has to know about a game's
// object catalog) moved up to @bloobitygook/objects, which depends on
// this package — not the other way around.
export const DEFAULT_GRAVITY = { mode: "uniform", magnitude: 900, x: 400, y: 300 };

// Accepts the pre-point-gravity file format (a bare number) alongside the
// current { mode, magnitude, x, y } shape, so older saved scenes still load.
export function normalizeGravity(raw) {
  if (raw == null) return { ...DEFAULT_GRAVITY };
  if (typeof raw === "number") return { ...DEFAULT_GRAVITY, magnitude: raw };
  return { ...DEFAULT_GRAVITY, ...raw };
}
