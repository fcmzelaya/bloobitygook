import { createCatalog } from "./catalog.js";
import { ballDefinition } from "./definitions/ball.js";
import { pieceDefinitions } from "./definitions/pieces.js";
import { spawnerDefinition } from "./definitions/spawner.js";

// Every object type the engine knows about, across every game. A game
// enables its own subset via `STANDARD_CATALOG.enabledIn(catalogIds)`
// (see packages/engine/src/scene.js) rather than this list growing
// per-game branches.
export const STANDARD_DEFINITIONS = [ballDefinition, ...pieceDefinitions, spawnerDefinition];

export const STANDARD_CATALOG = createCatalog(STANDARD_DEFINITIONS);
