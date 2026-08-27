# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

bloobitygook is an SVG + vanilla JS game engine and the games built on it — a pnpm workspace of small, mostly-pure packages plus one app per game. **The actual product is the tool, not any single game**: a shared ECS core, a growing set of game-logic packages (grid collision, triggers, animation, behavior), an in-browser editor with a GitHub-PR-based game-creation wizard, and a public hub listing whatever's published. See [docs/games-roadmap.md](docs/games-roadmap.md) for the full plan, phase-by-phase history, and what's still ahead (a platformer, as a generic capability demo rather than a specific-IP clone).

**Guiding principle carried through every phase**: grow the engine only as far as the next game actually needs. Don't generalize a system until a second real use case demands it — see `packages/triggers` below for the clearest example of this working out.

## Running it

```bash
pnpm install
pnpm dev:play      # http://localhost:5175 — the original blob-physics demo
pnpm dev:editor    # http://localhost:5176 — the dev tool
pnpm dev:tetris    # http://localhost:5178
pnpm dev:hub       # http://localhost:5179 — public games list
pnpm dev:pacman    # http://localhost:5182
pnpm test          # runs every workspace package's test suite
pnpm build         # builds every app, then composes them into dist-site/
```

Needs a real Vite dev server (not `file://`) — ES module imports and scene/manifest fetches both require an HTTP origin. No Turborepo — small enough that plain `pnpm -r`/`pnpm --filter` scripts are simpler; revisit only if build times become annoying.

`functions/` (the Cloud Function in Deployment below) is outside the pnpm workspace, so `pnpm test`/`pnpm build` don't touch it — run `npm test` from inside `functions/` directly.

## Package/app shape

```
packages/
  engine/         pure ECS core + the original ball-physics demo's systems
  grid/           tile-based collision + composite pieces + generic spawner/gravity — built for, and only used by, Tetris-shaped games
  triggers/       generic condition -> action, zero dependencies
  animation/      frame-based sprite animation (SVG attribute swaps, not image assets)
  behavior/       generic state machine + seek/flee movement primitives
  stage/          tiny, dependency-free orchestration (runStage/dispatch) composing whichever systems a game's stage actually needs
  tetris-pieces/  the one genuinely Tetris-specific package — pure piece shape/color/rotation data, no game-rule logic
  game-manifest/  shape/helpers for a published game's games/<id>/manifest.json

apps/
  play/     the blob-physics demo, light + public — deploys to /blob/
  tetris/   a Tetris "stage assembly" wiring packages/grid + triggers + stage + tetris-pieces into one configured instance — /tetris/
  pacman/   full game, on packages/animation + packages/triggers + packages/behavior — /pacman/
  hub/      public list of published games, fetches a Storage-hosted aggregate, no SDK — / (site root)
  editor/   the dev tool — React UI chrome around an imperative engine bridge

functions/  one Storage-triggered Cloud Function maintaining that hub aggregate — outside the pnpm workspace
```

Every game app builds with its own Vite `base` (`/tetris/`, `/pacman/`, `/blob/`) and gets combined into one deployable tree by `scripts/compose-site.mjs` (see Deployment below). `apps/editor` is not part of that composed site — it deploys to its own separate Firebase Hosting site, since it's a dev tool, not something players load.

## Entity/component pattern

Entities are plain objects (`{id, ...fields}`), components are just fields on them, systems are plain functions that `query(world, [...fields])` and mutate matches — no framework, no inheritance. Established in `packages/engine/src/world.js`, reused by every package and app since.

## packages/engine

The original core, still exactly what `apps/play` and the blob-editing half of `apps/editor` run on. **Not used by Tetris or Pac-Man's gameplay** — they only pull `createWorld`/`spawn`/`destroy`/`query`/`createSvgElement`/`setAttrs`/`clearChildren`/`startLoop` from it, not the physics systems below. Since Phase 7 of the games roadmap, that split is an enforced package contract, not just convention: `package.json` has two subpath exports, no bare `"."` — `"./core"` (world/svg/loop) and `"./physics"` (everything blob-specific). Tetris/Pac-Man and every game-logic package (`grid`/`animation`/`behavior`) import only `@bloobitygook/engine/core`; `apps/play` and `apps/editor/src/engine.js` import both subpaths as needed.

- `core.js` — re-exports `world.js`/`svg.js`/`loop.js`, the `"./core"` subpath's entire surface.
- `world.js` — `createWorld`, `spawn`, `destroy`, `query`, `clear`.
- `svg.js` — `createSvgElement`, `setAttrs`, `clearChildren`; the only place that touches `document.createElementNS`.
- `loop.js` — `requestAnimationFrame` loop; dt is clamped so a dropped/backgrounded frame doesn't teleport entities.
- `physics.js` — the `"./physics"` subpath's barrel: re-exports `systems.js`'s 6 systems plus `scene.js`/`fileio.js`/`objects/ball.js`/`color.js`. Deliberately does not re-export core, keeping the two subpaths' scope disjoint.
- `systems.js` (formerly `physics.js` before the Phase 7 rename) — continuous bounce physics for the blob demo only: `gravitySystem` (`gravity = {mode: "uniform"|"point", magnitude, x, y}`; point mode pulls toward `(x,y)` at *constant* magnitude, deliberately not inverse-square, so one slider is comparable across modes), `integrateSystem` (semi-implicit Euler), `collisionSystem` (floor/wall bounds, restitution/friction), `ballCollisionSystem` (ball-vs-ball, broad-phased with a uniform grid so it's not O(n²)), `deformationSystem` (a spring driving squash-on-impact), `renderSystem` (the only system touching the DOM).
- `color.js` — `hslToHex`/`randomBallColor`.
- `scene.js` — `serializeScene`/`loadScene` for the blob demo's scene format. `SPAWNERS` maps a scene object's `type` to its spawn function. Gravity is normalized on load so scenes saved before point-gravity existed still load.
- `fileio.js` — File System Access API wrapped with a download-link fallback; `hasFileSystemAccess` guards against `window` not existing at all (Node/test/future-server contexts), not just against the API being unsupported.
- `objects/ball.js` — the blob demo's one entity type.

Package resolution note, relevant to every package here: they all ship raw ESM with no build step. Every other package still exports a single `"."` (`"exports": {".": "./src/index.js"}`) — `packages/engine` is the one exception, with the two subpaths above instead. Every app's `vite.config.js` excludes its workspace deps from `optimizeDeps` by package name (not by subpath, which Vite doesn't distinguish here) — otherwise esbuild's pre-bundler treats a workspace-linked package as an immutable third-party dep and stale-caches it, breaking hot reload on edits.

## packages/grid (Tetris-shaped games)

`collision.js` — `canPlace(occupied, cells, bounds)`, `checkCompleteRows(occupied, bounds)`, `rowAfterClear`/`occupiedAfterClear` (post-clear row-shift math, rebuilt as a fresh `Set` each time rather than mutated cell-by-cell — see its doc comment for the real ordering bug that pattern caused), all pure functions over a `Set` of `"col,row"` keys, no ECS dependency. Also exports `collisionStrategies` — a `{ boundsAndOccupancy: canPlace }` registry so a caller can select a collision strategy by name, with room to add a second implementation later without changing any caller's contract. `cellGroup.js` — the falling composite piece: **one** entity holding a list of relative cell offsets, rendered as one `<g>` with N `<rect>` children that get reused (not recreated) across rotations. `block.js` — the individual static cells a piece decomposes into on landing, which is what line-clearing actually needs to query/remove one at a time.

Three more generic capabilities, added when Tetris was rewritten to pull reusable tools out of what used to be Tetris-owned logic, rather than a Tetris-specific package:
- `transform.js` — `attemptTransform(piece, patch, occupied, bounds, strategy = canPlace)`, the one shared "try a candidate change, roll back on collision" helper. Used identically for horizontal moves, rotation, and drop ticks, so none of them hand-duplicate "build a candidate, test collision, mutate-or-reject."
- `spawner.js` — `createSpawner({candidates, strategy})`, generic candidate selection with lookahead (`next()`/`peek()`) — nothing here knows "piece" is a Tetris concept; a future game could spawn enemies/items through the same function. Each strategy is a factory returning a stateful `pick()` closure, so a future stateful strategy (e.g. a shuffled-bag algorithm) is a new registry entry, not a redesign.
- `gridGravity.js` — `applyGridGravity(entity, direction, occupied, bounds, strategy)`, the discrete, direction-configurable counterpart to `packages/engine`'s continuous physics `gravitySystem` (not a unification of the two — continuous-velocity integration and discrete per-tick stepping are different computations). `direction` is a `{dcol, drow}` vector; `{dcol:0, drow:1}` is "down" for Tetris, but nothing here assumes that.

Deliberately no true parent-child ECS relationship, no formal game-config package inside grid itself — that composition role belongs to `packages/stage` instead (below). Tetris's board is procedural (nothing authored to save); its moves are just validated-mutation calls, now made via the generic `attemptTransform`/`applyGridGravity` rather than app-owned duplicated logic.

## packages/triggers

`createTrigger({condition, action})` + `runTriggers(world, triggers)` — condition returns whatever matched, action runs once per tick something did, `runTriggers` returns which triggers fired and their matches (so a caller like Tetris's scoring doesn't need to re-derive what happened). Zero dependencies. `zone.js` adds a spatial-entry helper (`createZone`/`isInsideZone`/`zoneEntryCondition`) for portal-style triggers.

This is the one package whose generalization got real validation, not just a plausible-sounding unit test: Tetris's line-clearing was retrofitted from an inline `checkCompleteRows`+`clearRows` call to a `lineClearTrigger`, confirmed byte-identical before/after. Pac-Man's tunnel portals are the second use case, and a genuinely different shape (spatial zone entry vs. a board-state condition) — good evidence the abstraction actually covers more than one thing.

`tieredGoal.js` — `createTieredGoalTrigger({condition, tierNames, onAchieve})`, built on top of `createTrigger` (unchanged). Generalizes "count how many things completed at once, name the tier" — Tetris's single/double/triple/tetris line-clear naming is the validating second use case for this specific pattern, the same way portals validated the base condition→action shape.

## packages/animation

`createAnimation(frames, fps)` + `advanceAnimation` (pure step function, separated from the ECS loop for testability, uses a `while` loop so a large `dt` catches up to the correct frame instead of falling one behind) + `animationSystem(world, dt)`. A "frame" is a set of SVG attributes to apply, not an image asset — consistent with how the rest of the engine renders. Used by Pac-Man for a chomp pulse (a radius swap, not literal mouth-shape path-arc math — proves the mechanism without geometry work that's polish, not capability).

## packages/behavior

`createBehavior(states, initial)` + `stepBehavior` + `behaviorSystem(world, dt)` — a generic state machine; each state has an optional `update(entity, dt, world)` and `next(entity, world)` returning the state to transition to. Deliberately has no "ghost" concept baked in. Also exports `seekToward`/`fleeFrom`, pure continuous-position movement primitives.

**Only the state-machine half has a real consumer.** Pac-Man's ghosts use `createBehavior`/`behaviorSystem` for their chase/flee states, but ghost *movement* goes through `apps/pacman`'s own tile-locked `movement.js` + `ghostAI.js` (intersection direction-choice by closest/farthest targeting), not `seekToward`/`fleeFrom` — those remain unit-tested only, not yet proven against a real app. Worth remembering before assuming they're validated the way the state machine is.

## packages/stage

`runStage(stage, world, dt)` + `createActionDispatcher(stage)` — genuinely generic, zero dependencies (not even on `engine`/`grid`/`triggers`), because it only composes whatever functions a `stage` config hands it rather than assuming any particular game shape. `runStage` calls each `{fn, config}` in `stage.systems` as `fn(world, dt, config)` every tick (matching `packages/engine`'s own established system-function convention) — a stage only lists the systems it actually needs. `createActionDispatcher` is the event-driven counterpart: `dispatch(action, ...args)` looks up `stage.controls[action]` and calls it, for input-triggered moves (move/rotate/hard-drop) as opposed to `runStage`'s continuous per-tick systems (gravity). Built when Tetris was rewritten, but nothing here is Tetris-specific — a stage is just whichever systems/controls its assembly code chooses to wire in.

## packages/tetris-pieces

The one genuinely Tetris-specific package, and it's pure data: `PIECES` (the 4-precomputed-rotation-states-per-piece table, ported from the Python prototype — see `apps/tetris` below), `PIECE_COLORS`, `PIECE_TYPES`, `cellsForRotation`, `spawnPiece`. No collision, no spawning logic, no game rules — just what a tetromino *is*. Everything that used to be piece-selection logic (`randomPieceType`) moved into `packages/grid`'s generic `spawner.js` instead, since choosing among candidates isn't a Tetris-specific concept.

## packages/game-manifest

`createManifestEntry`/`isValidManifestEntry` — the shape of a `games/<id>/manifest.json` entry (`id`, `title`, `description`, `route`, `thumbnail`, `published`, `createdAt`, `sceneId`), pure, no Firebase dependency. Used by `apps/hub` (reading) and `apps/editor`'s `games.js` (writing) so neither pulls in the other's I/O concerns. `sceneId` (string or `null`) is which `scenes/<id>.json` a game's canvas editor loads — `null` for games with no editable scene yet (every hand-coded game, e.g. Tetris/Pac-Man; only the blob demo has one).

## packages/objects

The generic object-catalog layer sitting above `engine`/`grid`/`tetris-pieces`, built so the editor's scene canvas isn't hardcoded to one entity type (a physics ball) anymore. An **object definition** is a plain object — `{id, category, label, swatch, coordinateSpace, cellSize?, spawn(world, worldEl, def), serialize(entity), buildSpawnDef(x, y, catalog)}` — matching the codebase's existing `{name: value}` registry precedent (`collisionStrategies`, `PICK_STRATEGIES`) rather than a class hierarchy. `createCatalog(definitions)` (`catalog.js`) gives `byId`/`all`/`byCategory`/`enabledIn(ids)` — `enabledIn` is what lets one game declare "which of these I actually use" (its `catalogIds`), returning a same-shaped, composable, narrowed catalog.

Every spawned entity gets stamped with `entity.catalogId` at spawn time (`instantiate.js`'s `instantiateObject`/`serializeObject`) rather than being identified back by `entityType` — necessary because all 7 Tetris piece definitions spawn a `"cellGroup"` entity (per `packages/grid`), so `entityType` alone can't disambiguate which piece type an entity is on save.

`standard.js` assembles `STANDARD_DEFINITIONS`/`STANDARD_CATALOG`: `ball` (wraps `packages/engine`'s `spawnBall`, paired with a `serializeBall` that now lives next to it in `objects/ball.js`), the 7 Tetris piece types (`definitions/pieces.js`, wrapping `tetris-pieces`' `spawnPiece`; `coordinateSpace: "grid"` quantizes an editor click to `col`/`row` — purely for authoring on the fixed pixel canvas, no bearing on a game's real board size), and a `"spawner"` tool (`definitions/spawner.js`, category `"tool"`) — a placeable marker holding config (category + allowed-types subset + a `packages/grid` `SPAWNER_STRATEGIES` name) for a future gameplay pass to read and drive real spawning from; nothing consumes it yet, this pass only lets it be placed and edited.

`scene.js` (not `packages/engine`'s, which now only keeps gravity normalization — `packages/engine` can't depend on this package, since this package depends on it) generalizes `loadScene`/`serializeScene` to take a `catalog` argument, looking up spawn/serialize per entry instead of a hardcoded `SPAWNERS` map. `catalogIdsOf(sceneData)` defaults to `["ball"]` when a scene file predates this system, so every previously-saved scene (`apps/editor/public/scenes/default.json` included) still loads byte-identically.

## apps/play

`src/scenes.js` uses `import.meta.glob("../scenes/*.json", { eager: true })` to bake every scene JSON into the build — adding one is "drop a file in," not "edit an import list." Always simulating (no Setup/Run toggle, nothing to edit); click-to-spawn stays as a toy interaction. No Firebase dependency. Loads scenes via `packages/objects`' `loadScene`, narrowed to `STANDARD_CATALOG.enabledIn(["ball"])` since this demo only ever spawns balls directly (never through a palette) — it just needs the shared loader to resolve the `"ball"` type the same way the editor does.

## apps/tetris

`src/main.js` is a Tetris **stage assembly**, not owned game-rule logic — every rule it applies (collision, spawning, gravity, tiered goal detection, transform-attempt-and-reject) is a generic capability imported from `packages/grid`/`triggers`/`stage`; this file only supplies board size (10×20 @ 24px), the spawn origin, drop direction (`{dcol:0, drow:1}`), piece set, and scoring — configuration and wiring, not logic. The piece rotation table itself lives in `packages/tetris-pieces` (ported from the original Python prototype `valkirie/tetris/pieces.py` — same 4-precomputed-rotation-states-per-piece idea, translated from pixel `Vector` offsets to grid `{col,row}` offsets; verified structurally there, not here).

Features: hard drop (`space` — loops `applyGridGravity` until blocked, no new primitive needed), a next-piece preview (powered by the spawner's `peek()`), and a level system (drop speed increases and score multiplies as `totalLinesCleared` crosses `linesPerLevel` thresholds — this state is app-level, not a generic capability, since it's specific to how *this* game paces and scores itself). Line-clear scoring is tiered (single/double/triple/tetris) via `packages/triggers`' `createTieredGoalTrigger`.

**Known, accepted tradeoff**: `apps/editor/src/scaffold/tetris-template.js`'s wizard-generated Tetris instances mirror this file's assembly shape as a hand-maintained generated-code template, not a shared runtime function call — consistent with how the wizard already bakes config (port/id) as literal generated code everywhere else, not a new problem introduced here. Keep the two in sync by hand when either changes.

## apps/pacman

**Does not depend on `packages/grid`** — Pac-Man needs continuous tile-locked movement (smooth between cell centers, not instant jumps), a different enough shape from Tetris's discrete drops that it got its own `movement.js` instead.

- `maze.js` — an 11×9 ASCII maze (`#` wall, `.` pellet, `o` power pellet), with a tunnel row (row 4) that's the only place `isWallAt` allows a column outside `[0, COLS)`. Connectivity is checked by an automated flood-fill/BFS test from the player's spawn point, not just a by-hand walkthrough — exactly the kind of thing a hand-authored maze can get subtly wrong (an isolated, uncollectable pellet).
- `movement.js` — `tryMove(entity, dt, isBlocked, cellSize)`, shared by the player and ghosts alike; the only difference between them is *who* sets `queuedDirection` (keyboard vs. `ghostAI.chooseDirection`). **Finds the target cell via direction-aware `floor`/`ceil`, not `Math.round`** — round is ambiguous once an entity is past its current cell's midpoint, which caused a real bug during development (an entity could round back to the cell it just left and oscillate forever instead of progressing; caught by a multi-tick accumulation test, not by playing). Uses a `while` loop so reaching a target with movement budget left over re-decides (turn/continue/stop) immediately, not one frame late — the one-frame-late version let a blocked entity's stale direction briefly poke it into the wall.
- `ghostAI.js` — `chooseDirection(col, row, currentDirection, target, isBlocked, preference)`, picks the best open neighbor by distance to target (`"closest"` for chase, `"farthest"` for flee), won't reverse direction unless it's a dead end.
- `main.js` — wires walls/pellets/player/ghosts, portals (two `packages/triggers` zones on the tunnel row's far edges), ghost chase/flee via `packages/behavior`, the chomp pulse via `packages/animation`, scoring, win/lose, restart.

352×288 board at 32px cells.

## apps/hub

`src/games-storage.js` — no Firebase SDK dependency at all (dropped in Phase 7): `fetchAllManifests` does one plain `fetch` against Storage's public download URL for `games/index.json`, a single aggregated file the Cloud Function in `functions/index.js` maintains (see Deployment below), gracefully empty ("No games published yet.") on a 404 or when `VITE_FIREBASE_STORAGE_BUCKET` isn't configured. `selectPublishedGames` is a pure filter/sort, unit tested with a mocked `fetch`.

## apps/editor

The dev tool. Routed via `react-router`: `/` is a dashboard listing every game, `/:gameId` is a single game's editing view — editing is always scoped to one game at a time, never a free-floating "current scene." UI chrome is React; the physics world, SVG stage pointer handling, and 60fps render loop are not (they don't belong in React's re-render model).

- `src/App.jsx` — `BrowserRouter` > `CloudAuthProvider` > `AppHeader` (sign-in, status, New Game trigger, always mounted regardless of route) + the two routes + `WizardPanel` (a centered overlay reachable from either route).
- `src/routes/Dashboard.jsx` — lists games via `listGamesForEditor`, each linking to `/:gameId`; games are never created here directly, only opened (typing a not-yet-existing id and hitting Open just navigates — `GameEditor` handles the actual first save).
- `src/routes/GameEditor.jsx` — fetches the current game's manifest (its draft copy if one exists and the user can read it, else the public copy, else an empty `{id: gameId}` for a brand-new listing), always renders `GameMetadataForm`, and additionally renders `Stage`+`Toolbar`+`Inspector` only when the manifest has a `sceneId` — most games (Tetris, Pac-Man) don't, so they get metadata-only editing. `GameEditorRoute` wraps it with `key={gameId}` so switching games fully unmounts/remounts the subtree rather than relying on effect-dependency reasoning.
- `src/engine.js` — the imperative bridge for the scene canvas. Owns `world`/`gravity`/`mode`/`catalog`/`armedId`/`selected` as module state, exposes a `useSyncExternalStore`-compatible store (`subscribe`/`getSnapshot`) plus action functions (`setMode`, `setPaletteSelection`, `updateSelectedProp`, `handleStagePointerDown`, ...). `catalog` is a `packages/objects` `STANDARD_CATALOG.enabledIn(catalogIdsOf(data))`, rebuilt every time a scene loads (`applyLoadedScene`, shared by `initEngine`/`openSceneFromFile`/`loadSceneFromCloud`) since a different file can enable a different object set; `armedId` names which catalog entry the next stage click places, defaulting to the catalog's first entry so a ball-only scene keeps the original "click anywhere spawns a ball" UX with zero palette interaction required. `handleStagePointerDown` no longer hardcodes ball-spawning: it hit-tests via `findEntityAt` (generalized from the old `findBallAt`), then defers to the armed definition's own `buildSpawnDef(x, y, catalog)` to build whatever `instantiateObject` needs. `initEngine({..., sceneId})` takes which scene to load (published copy preferred, falling back to a local `public/scenes/<id>.json`, falling back to empty) since `Stage` can mount for a different game each time the route changes — paired with a real `disposeEngine()` (stops the physics loop via `startLoop`'s returned stop-function, resets all module state) called from `Stage`'s unmount effect, replacing what used to be a permanent one-shot `initialized` latch from when there was only ever one `Stage` for the app's whole lifetime.
- `src/components/Stage.jsx` — renders the `<svg>` shell via JSX, hands `engine.js` refs plus the current `sceneId` in a mount effect, and never re-renders its contents; disposes on unmount.
- `src/components/{Toolbar,Palette,Inspector}.jsx` — read `engine.js`'s store via `useSyncExternalStore`; `Toolbar` takes `sceneId` as a prop (scene editing/gravity/local save-open only — sign-in, game listing, and the wizard moved out to `AppHeader`/`Dashboard`). `Palette.jsx` is a sibling of Toolbar/Inspector, not nested in either — category-grouped buttons sourced from the snapshot's `catalog`, each arming `setPaletteSelection` for the next stage click; a game with one enabled object (every existing blob-demo scene) renders one button, unchanged from before this existed. `Inspector` branches on `selected.catalogId`/`definitionCategory` — the original ball fields, a spawner-config branch (category/allowed-types/strategy, the last sourced from `packages/objects`' re-exported `SPAWNER_STRATEGIES`), and a minimal label+Delete fallback for anything else (e.g. a placed piece) — no schema-driven form engine, just explicit branches.
- `src/components/GameMetadataForm.jsx` — the id/title/description/route/sceneId/published fields for one game; id is read-only (always the route's `gameId`, so renaming means navigating elsewhere, not retyping in place). "Save Draft" and "Publish" are two different actions hitting two different Storage paths (see `games.js` below), gated by two different permission tiers.
- `src/permissions.js` — `canPublish(user)`, a UI-only allowlist check that deliberately duplicates `storage.rules`' `isCanPublish` list by hand (no shared source of truth between client code and Storage rules — a stale client list only produces a confusing disabled button, real enforcement is server-side).
- `src/CloudAuthContext.jsx` — wraps Firebase auth state in a React context via `useEffect`+`useState`.
- `src/firebase-client.js` — the *only* place that calls `initializeApp` (calling it twice throws); `publish.js` and `games.js` both import `auth`/`storage`/`isCloudEnabled` from here rather than each creating their own.
- `src/publish.js` — scene publish/fetch to `scenes/<id>.json` in Storage, gated by sign-in (the `canEdit` tier), separate from local Save/Open (File System Access), which keeps working unauthenticated. No live listener — publishing is explicit and occasional, not sync.
- `src/games.js` — `publishGame`/`fetchGame`/`listGames` target the public `games/<id>/manifest.json` (the `canPublish` tier, per `storage.rules`); `saveDraft`/`fetchDraft` target `drafts/games/<id>/manifest.json` (the `canEdit` tier — editing a draft never makes it visible on `apps/hub`, only publishing does); `listGamesForEditor(user)` merges both for the dashboard, skipping the drafts read entirely when signed out rather than attempting a call `storage.rules` would reject.
- `src/scaffold/{template,tetris-template,repo-edits}.js` + `src/github-wizard.js` — the "New Game" wizard, unrelated to the manifest system above: it scaffolds real app code and opens a GitHub PR (Octokit), it doesn't touch Storage at all. A browser page can't write repo files or push commits directly, so this is the workaround: `template.js` generates the minimal engine-connected app shell (pure); `tetris-template.js` generates a complete, configured Tetris instance instead (board size/cell size/piece subset/drop speed/lines-per-level, all defaulting to `apps/tetris`'s own constants — see `## apps/tetris` above), mirroring `apps/tetris/src/main.js`'s stage-assembly shape as generated code; `WizardPanel.jsx`'s "Game type" selector (`blank`|`tetris`) picks which one `createGamePR` calls. `repo-edits.js` patches the *fetched* current content of root `package.json` (just the new `dev:<id>` script — the `build` script discovers `apps/*` dynamically and needs no per-app edit) and `scripts/compose-site.mjs` to register the new app's route (pure, throws loudly if its anchors don't match rather than corrupting them). `github-wizard.js` orchestrates branch → write files (passing each patched file's fetched `sha`, which GitHub's contents API requires for updating an existing file, not just creating one) → PR via an injected Octokit-shaped client (so the whole flow is unit tested without ever touching the real repo). Auth is a user-supplied fine-grained GitHub PAT stored only in `localStorage`. The generated PR body's one remaining manual checklist item is running `pnpm install` and committing the updated `pnpm-lock.yaml` — the wizard can't run pnpm from a browser, so a new app's dependencies never make it into the lockfile on its own; CI wiring itself is fully automatic (see Deployment below). Multi-scene-per-game configuration and in-editor menu building are explicitly not built yet — deferred, not designed around.

None of `publish.js`/`games.js`/`github-wizard.js`/`scaffold/*`/`ui-helpers.js` needed structural changes for the dashboard restructure — they never touched the DOM or routing, so their tests kept passing verbatim (`games.js` only grew new exports, didn't change existing ones). Good confirmation that pulling pure logic out of DOM-wiring early (a pattern started with `ui-helpers.js` back when the editor was still vanilla JS) keeps paying off as the app grows.

## Deployment

One Firebase project, two Hosting sites: `play` (target name, despite the name it now serves the *composed* `dist-site/` — hub at `/`, tetris/pacman/blob at their sub-paths) and `editor` (its own separate site). `scripts/compose-site.mjs` copies each game app's `dist/` into `dist-site/<route>/` after they're all built; see its `APPS` array for the route mapping — a new game app still needs a manual entry here (route prefixes aren't derivable), but since Phase 7, root `package.json`'s `build` script (`pnpm --filter "./apps/*" -r run build && pnpm compose`) discovers every `apps/*` workspace package dynamically and no longer needs a per-app edit; the wizard's PR body checklist was trimmed to match.

Storage (`storage.rules`): `scenes/`, `games/`, and `drafts/games/` are all public read except `drafts/games/` (`canEdit`-only read too, since it's working data `apps/hub` never touches). Writes are two-tier, both still just email allowlists (no custom claims — deliberately, for a two-person roster): `canEdit` can write `scenes/` and `drafts/games/`; only the smaller `canPublish` can write `games/`, since that path is what publishing a game actually means. `apps/editor/src/permissions.js`'s `canPublish` list is a UI-only duplicate of the rules' allowlist, kept in sync by hand. `firebase deploy --only storage` after editing that file — it's not automatic.

**`functions/` (Phase 7)**: one Storage-triggered, 2nd-gen Cloud Function, `rebuildGamesIndex` in `functions/index.js` — on any write to `games/<id>/manifest.json`, re-reads every manifest under `games/` and writes an aggregated `games/index.json` that `apps/hub` fetches directly. Eventarc-backed (no manual Pub/Sub setup); runs under the Admin SDK, so it bypasses `storage.rules` entirely rather than needing its own write exception. Outside the pnpm workspace (`pnpm-workspace.yaml` only globs `apps/*`/`packages/*`) — Firebase manages `functions/`'s own `npm install` independently. Requires the Blaze plan and Eventarc/Cloud Functions APIs enabled before `firebase deploy --only functions` will succeed (one-time manual setup, not automated by CI); `games/index.json` needs one manifest re-save through the editor's "Manage Games" panel after first deploy to bootstrap it. The pure aggregation logic (`functions/buildIndex.js`, `functions/manifestPath.js`) is unit tested; the Admin SDK wiring itself needs the Storage emulator (which needs a local Java install) to test directly, so treat it as unverified beyond code review until confirmed against a real deploy.

`.github/workflows/ci.yml` (test + build every app on PR/push, plus — since Phase 7 — a Firebase Hosting preview-channel deploy of `play`/`editor` on same-repo pull requests, giving a real hosted URL to test a new/changed game before merge) and `deploy.yml` (same build, plus `firebase deploy` with `channelId: live` on push to `main` — required there since only `pull_request` context lets the action infer live-vs-preview automatically).

## Coordinate systems

Per-app, not shared: blob demo is `800×600`; Tetris is `240×480` at 24px cells (10×20 board); Pac-Man is `352×288` at 32px cells (11×9 board). All SVG, y grows downward.

## Testing philosophy

Pure logic lives apart from DOM-wiring wherever the two can be separated (`ui-helpers.js` in the editor, `movement.js`/`maze.js`/`ghostAI.js` in Pac-Man, `collision.js`/`cellGroup.js` in grid) — that's what makes most of this unit-testable without jsdom or a real browser at all. Where wiring correctness genuinely matters (collision resolution, movement algorithms, trigger integration), live-browser verification supplements the unit tests: driving the actual built modules with constructed scenarios via the dev tools, not just trusting that passing unit tests imply correct end-to-end behavior. This caught at least one real bug (Pac-Man's movement rounding) that a narrower single-call unit test wouldn't have.

## Known gaps

- No platformer yet — the next planned game, scoped as a generic capability demo rather than a specific-IP clone.
- `packages/behavior`'s `seekToward`/`fleeFrom` aren't used by any app yet (see above) — validated by unit test only.
- No drag-to-move for placed objects in the editor canvas; position only changes via spawn point or loaded scene data. No undo anywhere.
- Not tested on touch/mobile input.
- Nothing is published to the hub by default — a human has to sign in (with `canPublish` permission specifically) and use the editor's dashboard/`GameMetadataForm` (or, soon, an actual finished game from the wizard) to get an entry listed.
- `apps/editor`'s production bundle is over Vite's 500kB warning threshold (React + Firebase + Octokit) — acceptable for a dev-only tool, not worth code-splitting yet.
- `apps/fertris` is still the wizard's blank scaffold (`createWorld`+`startLoop`, no game logic) plus a local editor scene (`apps/editor/public/scenes/fertris.json`) enabling its 7 Tetris piece types + the spawner tool for authoring. Placing pieces/spawners in the editor and saving them into a scene is now possible (see `packages/objects` above), but nothing reads a placed spawner to actually drive falling-piece gameplay yet — that's deliberately deferred to a follow-up pass, once the authoring side has been used for real.
