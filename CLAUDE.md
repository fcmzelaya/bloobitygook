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

## Package/app shape

```
packages/
  engine/         pure ECS core + the original ball-physics demo's systems
  grid/           tile-based collision + composite pieces — built for, and only used by, Tetris
  triggers/       generic condition -> action, zero dependencies
  animation/      frame-based sprite animation (SVG attribute swaps, not image assets)
  behavior/       generic state machine + seek/flee movement primitives
  game-manifest/  shape/helpers for a published game's games/<id>/manifest.json

apps/
  play/     the blob-physics demo, light + public — deploys to /blob/
  tetris/   full game, on packages/grid + packages/triggers — /tetris/
  pacman/   full game, on packages/animation + packages/triggers + packages/behavior — /pacman/
  hub/      public list of published games, reads Storage — / (site root)
  editor/   the dev tool — React UI chrome around an imperative engine bridge
```

Every game app builds with its own Vite `base` (`/tetris/`, `/pacman/`, `/blob/`) and gets combined into one deployable tree by `scripts/compose-site.mjs` (see Deployment below). `apps/editor` is not part of that composed site — it deploys to its own separate Firebase Hosting site, since it's a dev tool, not something players load.

## Entity/component pattern

Entities are plain objects (`{id, ...fields}`), components are just fields on them, systems are plain functions that `query(world, [...fields])` and mutate matches — no framework, no inheritance. Established in `packages/engine/src/world.js`, reused by every package and app since.

## packages/engine

The original core, still exactly what `apps/play` and the blob-editing half of `apps/editor` run on. **Not used by Tetris or Pac-Man's gameplay** — they only pull `createWorld`/`spawn`/`destroy`/`query`/`createSvgElement`/`setAttrs`/`clearChildren`/`startLoop` from it, not the physics systems below.

- `world.js` — `createWorld`, `spawn`, `destroy`, `query`, `clear`.
- `svg.js` — `createSvgElement`, `setAttrs`, `clearChildren`; the only place that touches `document.createElementNS`.
- `loop.js` — `requestAnimationFrame` loop; dt is clamped so a dropped/backgrounded frame doesn't teleport entities.
- `color.js` — `hslToHex`/`randomBallColor`.
- `physics.js` — continuous bounce physics for the blob demo only: `gravitySystem` (`gravity = {mode: "uniform"|"point", magnitude, x, y}`; point mode pulls toward `(x,y)` at *constant* magnitude, deliberately not inverse-square, so one slider is comparable across modes), `integrateSystem` (semi-implicit Euler), `collisionSystem` (floor/wall bounds, restitution/friction), `ballCollisionSystem` (ball-vs-ball, broad-phased with a uniform grid so it's not O(n²)), `deformationSystem` (a spring driving squash-on-impact), `renderSystem` (the only system touching the DOM).
- `scene.js` — `serializeScene`/`loadScene` for the blob demo's scene format. `SPAWNERS` maps a scene object's `type` to its spawn function. Gravity is normalized on load so scenes saved before point-gravity existed still load.
- `fileio.js` — File System Access API wrapped with a download-link fallback; `hasFileSystemAccess` guards against `window` not existing at all (Node/test/future-server contexts), not just against the API being unsupported.
- `objects/ball.js` — the blob demo's one entity type.

Package resolution note, relevant to every package here: they all ship raw ESM with no build step (`"exports": {".": "./src/index.js"}`). Every app's `vite.config.js` excludes its workspace deps from `optimizeDeps` — otherwise esbuild's pre-bundler treats a workspace-linked package as an immutable third-party dep and stale-caches it, breaking hot reload on edits.

## packages/grid (Tetris)

`collision.js` — `canPlace(occupied, cells, bounds)` and `checkCompleteRows(occupied, bounds)`, pure functions over a `Set` of `"col,row"` keys, no ECS dependency. `cellGroup.js` — the falling composite piece: **one** entity holding a list of relative cell offsets, rendered as one `<g>` with N `<rect>` children that get reused (not recreated) across rotations. `block.js` — the individual static cells a piece decomposes into on landing, which is what line-clearing actually needs to query/remove one at a time.

Deliberately no true parent-child ECS relationship, no generic "action system," no formal game-config package — Tetris's board is procedural (nothing authored to save) and its moves are just validated-mutation functions in `apps/tetris` itself. Revisit if a second game ever needs authored level content.

## packages/triggers

`createTrigger({condition, action})` + `runTriggers(world, triggers)` — condition returns whatever matched, action runs once per tick something did, `runTriggers` returns which triggers fired and their matches (so a caller like Tetris's scoring doesn't need to re-derive what happened). Zero dependencies. `zone.js` adds a spatial-entry helper (`createZone`/`isInsideZone`/`zoneEntryCondition`) for portal-style triggers.

This is the one package whose generalization got real validation, not just a plausible-sounding unit test: Tetris's line-clearing was retrofitted from an inline `checkCompleteRows`+`clearRows` call to a `lineClearTrigger`, confirmed byte-identical before/after. Pac-Man's tunnel portals are the second use case, and a genuinely different shape (spatial zone entry vs. a board-state condition) — good evidence the abstraction actually covers more than one thing.

## packages/animation

`createAnimation(frames, fps)` + `advanceAnimation` (pure step function, separated from the ECS loop for testability, uses a `while` loop so a large `dt` catches up to the correct frame instead of falling one behind) + `animationSystem(world, dt)`. A "frame" is a set of SVG attributes to apply, not an image asset — consistent with how the rest of the engine renders. Used by Pac-Man for a chomp pulse (a radius swap, not literal mouth-shape path-arc math — proves the mechanism without geometry work that's polish, not capability).

## packages/behavior

`createBehavior(states, initial)` + `stepBehavior` + `behaviorSystem(world, dt)` — a generic state machine; each state has an optional `update(entity, dt, world)` and `next(entity, world)` returning the state to transition to. Deliberately has no "ghost" concept baked in. Also exports `seekToward`/`fleeFrom`, pure continuous-position movement primitives.

**Only the state-machine half has a real consumer.** Pac-Man's ghosts use `createBehavior`/`behaviorSystem` for their chase/flee states, but ghost *movement* goes through `apps/pacman`'s own tile-locked `movement.js` + `ghostAI.js` (intersection direction-choice by closest/farthest targeting), not `seekToward`/`fleeFrom` — those remain unit-tested only, not yet proven against a real app. Worth remembering before assuming they're validated the way the state machine is.

## packages/game-manifest

`createManifestEntry`/`isValidManifestEntry` — the shape of a `games/<id>/manifest.json` entry (`id`, `title`, `description`, `route`, `thumbnail`, `published`, `createdAt`), pure, no Firebase dependency. Used by `apps/hub` (reading) and `apps/editor`'s `games.js` (writing) so neither pulls in the other's I/O concerns.

## apps/play

`src/scenes.js` uses `import.meta.glob("../scenes/*.json", { eager: true })` to bake every scene JSON into the build — adding one is "drop a file in," not "edit an import list." Always simulating (no Setup/Run toggle, nothing to edit); click-to-spawn stays as a toy interaction. No Firebase dependency.

## apps/tetris

Piece rotation table in `src/pieces.js` ported from the original Python prototype (`valkirie/tetris/pieces.py`) — same 4-precomputed-rotation-states-per-piece idea, translated from pixel `Vector` offsets to grid `{col,row}` offsets; verified structurally (every rotation state is 4 non-overlapping cells, the O-piece is rotation-invariant). 10×20 board at 24px cells. Gravity-tick drop, hard lock on landing (decomposes the falling piece into individual `packages/grid` blocks), line-clear via the `lineClearTrigger` described above, score, game over + restart.

## apps/pacman

**Does not depend on `packages/grid`** — Pac-Man needs continuous tile-locked movement (smooth between cell centers, not instant jumps), a different enough shape from Tetris's discrete drops that it got its own `movement.js` instead.

- `maze.js` — an 11×9 ASCII maze (`#` wall, `.` pellet, `o` power pellet), with a tunnel row (row 4) that's the only place `isWallAt` allows a column outside `[0, COLS)`. Connectivity is checked by an automated flood-fill/BFS test from the player's spawn point, not just a by-hand walkthrough — exactly the kind of thing a hand-authored maze can get subtly wrong (an isolated, uncollectable pellet).
- `movement.js` — `tryMove(entity, dt, isBlocked, cellSize)`, shared by the player and ghosts alike; the only difference between them is *who* sets `queuedDirection` (keyboard vs. `ghostAI.chooseDirection`). **Finds the target cell via direction-aware `floor`/`ceil`, not `Math.round`** — round is ambiguous once an entity is past its current cell's midpoint, which caused a real bug during development (an entity could round back to the cell it just left and oscillate forever instead of progressing; caught by a multi-tick accumulation test, not by playing). Uses a `while` loop so reaching a target with movement budget left over re-decides (turn/continue/stop) immediately, not one frame late — the one-frame-late version let a blocked entity's stale direction briefly poke it into the wall.
- `ghostAI.js` — `chooseDirection(col, row, currentDirection, target, isBlocked, preference)`, picks the best open neighbor by distance to target (`"closest"` for chase, `"farthest"` for flee), won't reverse direction unless it's a dead end.
- `main.js` — wires walls/pellets/player/ghosts, portals (two `packages/triggers` zones on the tunnel row's far edges), ghost chase/flee via `packages/behavior`, the chomp pulse via `packages/animation`, scoring, win/lose, restart.

352×288 board at 32px cells.

## apps/hub

`src/games-storage.js` — public, unauthenticated Storage reads (`games/` prefix), gracefully empty ("No games published yet.") when nothing's published or Firebase isn't configured. `selectPublishedGames` is a pure filter/sort, unit tested without touching Firebase at all.

## apps/editor

The dev tool. UI chrome is React; the physics world, SVG stage pointer handling, and 60fps render loop are not (they don't belong in React's re-render model).

- `src/engine.js` — the imperative bridge for the blob-physics scene editor. Owns `world`/`gravity`/`mode`/`selected` as module state, exposes a `useSyncExternalStore`-compatible store (`subscribe`/`getSnapshot`) plus action functions (`setMode`, `selectEntity`, `updateSelectedProp`, `handleStagePointerDown`, ...). `initEngine` is guarded against double-invocation (StrictMode-safe even though StrictMode isn't currently used, on purpose — see `main.jsx`'s comment).
- `src/components/Stage.jsx` — renders the `<svg>` shell via JSX, hands `engine.js` a ref to `#world` in a mount effect, and never re-renders its contents; React and the imperative ball-rendering code share one SVG tree without conflict.
- `src/components/{Toolbar,Inspector,GamesPanel,WizardPanel}.jsx` — read `engine.js`'s store via `useSyncExternalStore`, or own local `useState` for their own concerns (games list, wizard form fields).
- `src/CloudAuthContext.jsx` — wraps Firebase auth state in a React context via `useEffect`+`useState`, shared by the toolbar (sign-in button, scene publish gating) and the games panel (save-game gating).
- `src/firebase-client.js` — the *only* place that calls `initializeApp` (calling it twice throws); `publish.js` and `games.js` both import `auth`/`storage`/`isCloudEnabled` from here rather than each creating their own.
- `src/publish.js` — scene publish/fetch to `scenes/<id>.json` in Storage, gated by sign-in, separate from local Save/Open (File System Access), which keeps working unauthenticated. No live listener — publishing is explicit and occasional, not sync.
- `src/games.js` — the same pattern for `games/<id>/manifest.json`, using `@bloobitygook/game-manifest` for shape. This is the "Manage Games" panel's backing — the minimal stand-in for a real publish flow until/unless something fancier is needed.
- `src/scaffold/{template,repo-edits}.js` + `src/github-wizard.js` — the "New Game" wizard. A browser page can't write repo files or push commits, so this opens a real GitHub PR via Octokit instead: `template.js` generates a minimal engine-connected app shell (pure), `repo-edits.js` patches the *fetched* current content of root `package.json` and `scripts/compose-site.mjs` to register the new app (pure, throws loudly if its anchors don't match rather than corrupting them), `github-wizard.js` orchestrates branch → write files → PR via an injected Octokit-shaped client (so the whole flow is unit tested without ever touching the real repo). Auth is a user-supplied fine-grained GitHub PAT stored only in `localStorage`. **Not automated**: wiring the new app into `.github/workflows/ci.yml`/`deploy.yml` — left as a checklist item in the generated PR body rather than fragile YAML string-patching.

None of `publish.js`/`games.js`/`github-wizard.js`/`scaffold/*`/`ui-helpers.js` needed to change during the React migration — they never touched the DOM, so their tests kept passing verbatim throughout. Good confirmation that pulling pure logic out of DOM-wiring early (a pattern started with `ui-helpers.js` back when the editor was still vanilla JS) keeps paying off as the app grows.

## Deployment

One Firebase project, two Hosting sites: `play` (target name, despite the name it now serves the *composed* `dist-site/` — hub at `/`, tetris/pacman/blob at their sub-paths) and `editor` (its own separate site). `scripts/compose-site.mjs` copies each game app's `dist/` into `dist-site/<route>/` after they're all built; see its `APPS` array for the route mapping (update it, plus root `package.json`'s `build` script, when adding a new game app manually — the wizard does the same edits automatically for apps it scaffolds).

Storage (`storage.rules`): `scenes/` and `games/` are both public read, write gated to `request.auth != null` and an email allowlist. `firebase deploy --only storage` after editing that file — it's not automatic.

`.github/workflows/ci.yml` (test + build every app on PR/push, no deploy) and `deploy.yml` (same, plus `firebase deploy` with `channelId: live` — required on a plain `push` trigger since only `pull_request` context lets the action infer live-vs-preview automatically).

## Coordinate systems

Per-app, not shared: blob demo is `800×600`; Tetris is `240×480` at 24px cells (10×20 board); Pac-Man is `352×288` at 32px cells (11×9 board). All SVG, y grows downward.

## Testing philosophy

Pure logic lives apart from DOM-wiring wherever the two can be separated (`ui-helpers.js` in the editor, `movement.js`/`maze.js`/`ghostAI.js` in Pac-Man, `collision.js`/`cellGroup.js` in grid) — that's what makes most of this unit-testable without jsdom or a real browser at all. Where wiring correctness genuinely matters (collision resolution, movement algorithms, trigger integration), live-browser verification supplements the unit tests: driving the actual built modules with constructed scenarios via the dev tools, not just trusting that passing unit tests imply correct end-to-end behavior. This caught at least one real bug (Pac-Man's movement rounding) that a narrower single-call unit test wouldn't have.

## Known gaps

- No platformer yet — the next planned game, scoped as a generic capability demo rather than a specific-IP clone.
- `packages/behavior`'s `seekToward`/`fleeFrom` aren't used by any app yet (see above) — validated by unit test only.
- The blob-physics `packages/engine` still has only one entity type (`ball`) — untouched since neither `apps/play` nor the editor's scene tooling has needed more.
- No drag-to-move for placed blob-demo objects; position only changes via spawn point or loaded scene data. No undo anywhere.
- Not tested on touch/mobile input.
- Nothing is published to the hub by default — a human has to sign in and use the editor's "Manage Games" panel (or, soon, an actual finished game from the wizard) to get an entry listed.
- `apps/editor`'s production bundle is over Vite's 500kB warning threshold (React + Firebase + Octokit) — acceptable for a dev-only tool, not worth code-splitting yet.
