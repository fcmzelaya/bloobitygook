import { createCatalog } from "./catalog.js";

// Every object type the engine knows about, across every game, is
// discovered from ./definitions/*.js rather than hand-imported one by
// one — adding a new definition file needs zero edits here, matching
// apps/play/src/scenes.js's exact "drop a file in" pattern. Each module's
// default export is either one definition or an array of them (pieces.js
// exports all 7 piece definitions from one file).
const modules = import.meta.glob("./definitions/*.js", { eager: true });

export const STANDARD_DEFINITIONS = Object.values(modules).flatMap((mod) =>
  Array.isArray(mod.default) ? mod.default : [mod.default]
);

// A game enables its own subset via `STANDARD_CATALOG.enabledIn(catalogIds)`
// (see this package's own scene.js) rather than this list growing
// per-game branches.
export const STANDARD_CATALOG = createCatalog(STANDARD_DEFINITIONS);
