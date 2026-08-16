# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

bloobitygook is a small custom SVG + vanilla JS physics playground/engine. It's a pnpm workspace with one shared engine package and two apps built on it:

- **`apps/play`** — the light, public build. No editing UI, no cloud dependency. Ships with scene(s) baked into the build at compile time (not fetched at runtime). This is what gets deployed for players.
- **`apps/editor`** — the heavy, dev-facing build. Full Setup/Run toggle, live property inspector, configurable gravity, local file save/open, and a Publish flow for sharing scenes with collaborators via Cloud Storage (behind Google Sign-In). This is where scenes actually get authored.
- **`packages/engine`** — the shared physics/ECS logic both apps import. This is the one place with real logic worth testing; both apps are thin consumers of it.

Multiplayer ("shared universe" gameplay) is an explicit future phase — not built yet. `packages/engine`'s systems are already plain functions over plain-object entity state with no DOM coupling except `renderSystem`, and scenes already round-trip to/from JSON — the right shape for a later server-authoritative tick loop to reuse without a rewrite. The one thing to watch: entities carry live DOM refs (`el`, `circleEl`) as component fields; keep those out of anything that eventually gets serialized for network sync.

## Running it

```bash
pnpm install
pnpm dev:play      # apps/play dev server, http://localhost:5175
pnpm dev:editor    # apps/editor dev server, http://localhost:5176
pnpm test          # runs every workspace package's test suite
pnpm build         # builds both apps to apps/*/dist
```

Needs a real Vite dev server (not `file://`) — ES module imports and scene fetches both require an HTTP origin. No Turborepo — two apps and one package is small enough that plain `pnpm -r`/`pnpm --filter` scripts are simpler; revisit only if build times become annoying.

## Architecture

Entity/component pattern, no framework: entities are plain objects (`{id, ...fields}`), components are just fields on them, systems are plain functions that `query(world, [...fields])` and mutate matches. See `packages/engine/src/world.js`.

- `world.js` — `createWorld`, `spawn`, `destroy`, `query`, `clear`.
- `svg.js` — tiny DOM helpers (`createSvgElement`, `setAttrs`, `clearChildren`); the only place that touches `document.createElementNS`.
- `loop.js` — `requestAnimationFrame` loop; dt is clamped so a dropped/backgrounded frame doesn't teleport entities.
- `color.js` — `hslToHex`/`randomBallColor`, shared by both apps for randomizing spawned ball colors (kept as hex so it round-trips through both SVG `fill` and an `<input type="color">`).
- `physics.js` — all simulation systems, called in this order from each app's `update(dt)`:
  1. `gravitySystem` — `gravity` is `{mode: "uniform"|"point", magnitude, x, y}`. Uniform adds straight down; point pulls toward `(x,y)` at constant magnitude (deliberately not inverse-square, so the same slider is comparable between modes).
  2. `integrateSystem` — semi-implicit Euler position update.
  3. `collisionSystem` — floor/wall bounds; reflects velocity by `restitution`, damps tangential velocity by `friction`.
  4. `ballCollisionSystem` — ball-vs-ball. Broad-phased with a uniform grid (cell size ≈ 2× the largest ball on scene) so it's not an O(n²) pairwise scan; narrow phase is a standard impulse-based elastic collision with mass ∝ radius² (area, uniform density).
  5. `deformationSystem` — a spring pulling `scaleX`/`scaleY` back toward 1. Collisions inject velocity into `scaleVelX`/`scaleVelY` (`applyImpact` for the directional wall/floor squash, `applyIsotropicImpact` for ball-ball hits since that contact normal isn't axis-aligned).
  6. `renderSystem` — the only system that touches the DOM; everything upstream is pure data mutation.
- `scene.js` — `serializeScene`/`loadScene`. Scene files are JSON. `SPAWNERS` maps a scene object's `type` string to its spawn function — adding a new object type is one entry here plus a new `spawnX()` in `objects/`, nothing else. Gravity is normalized on load so older scene files with a bare number still work.
- `fileio.js` — wraps `showSaveFilePicker`/`showOpenFilePicker` (Chrome/Edge) with a download-link/`<input type=file>` fallback elsewhere. `hasFileSystemAccess` guards against `window` not existing at all (Node/test/future-server contexts), not just against the API being unsupported. `saveScene` accepts an existing file handle so repeat saves overwrite in place instead of re-prompting.
- `objects/ball.js` — the one entity type so far. Spawns a `<g><circle></g>` pair; the group (`el`) gets the transform, the circle (`circleEl`) gets `r`/`fill` written directly so the editor's inspector can edit radius/color live.
- `index.js` — barrel export; both apps import from `@bloobitygook/engine`, never from individual files inside the package.

Package resolution note: `packages/engine` ships raw ESM with no build step (`"exports": {".": "./src/index.js"}`). Both apps' `vite.config.js` set `optimizeDeps: { exclude: ["@bloobitygook/engine"] }` — otherwise esbuild's dependency pre-bundler treats the workspace-linked package as an immutable third-party dep and stale-caches it, so edits stop hot-reloading.

## apps/play

`src/scenes.js` uses `import.meta.glob("../scenes/*.json", { eager: true })` to bake every JSON file in `scenes/` into the build — adding a scene is "drop a file in," not "edit an import list." If more than one scene exists, a `<select>` picker appears. Always simulating (no Setup/Run toggle since there's nothing to edit); click-to-spawn stays as a fun toy interaction. No Firebase dependency at all.

## apps/editor

`mode` is `"setup"` or `"running"`. In `setup`, `update()` is a no-op — nothing moves, so objects can be placed and edited. Clicking empty stage spawns and selects a new ball; clicking an existing ball selects it instead (hit-tested by distance-to-center — see `findBallAt` in `src/ui-helpers.js`, last-spawned wins on overlap). The inspector panel edits the selected ball's radius/color/restitution/friction live; Delete removes it from both `world` and the DOM. Switching to `running` clears the selection and starts the physics systems ticking each frame.

`src/ui-helpers.js` holds the pure, testable pieces pulled out of `main.js`'s DOM wiring: `findBallAt`, and the gravity-marker-visibility/place-button-enabled/status-text predicates. This is what gives the editor its own test coverage beyond re-running the shared engine suite — `main.js` itself stays DOM-wiring glue, deliberately kept out of the test surface.

The toolbar's gravity dropdown switches `gravity.mode` between `uniform` (default, "Earth") and `point`. In point mode, "Place Point" arms a one-shot click-to-place on the stage; the marker (`#gravity-marker` in the SVG) is purely visual, `pointer-events: none`.

`src/publish.js` (Cloud Storage + Google Sign-In) lets a signed-in, allowlisted collaborator publish the current scene to a shared bucket path (`scenes/<sceneId>.json`) — separate from local Save/Open, which keeps working unauthenticated. Publishing is explicit and occasional, not live sync: no realtime listener, no concurrent-edit merge logic. Requires `VITE_FIREBASE_*` env vars (see `.env.example`); the app degrades gracefully (cloud buttons disabled, local save/open unaffected) when they're absent.

## Coordinate system

SVG `viewBox="0 0 800 600"`, y grows downward. `bounds = {floorY: 560, left: 0, right: 800}` is a constant in each app's `main.js` — not yet per-scene configurable.

## Known gaps

- Only one object type (`ball`) — no walls/platforms/other placeable shapes yet.
- No drag-to-move for placed objects; position only changes via spawn point or loaded scene data.
- No undo.
- Not tested on touch/mobile input — pointer events should mostly work but haven't been verified there.
- Firebase project setup (Storage, Auth, Hosting, CI secrets) is documented in the restructure plan but is a manual, account-level step — not automatable from here.
