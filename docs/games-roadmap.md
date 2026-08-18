# Games roadmap: Tetris → Pac-Man → Mario vs. Donkey Kong

## Context

bloobitygook today is a physics sandbox (`packages/engine` + the `apps/play`/`apps/editor` blob demo) — an ECS core plus one concrete system set (continuous bounce physics for balls). The three planned games need engine capabilities that don't exist yet: composite objects, grid/blocking collision, an action system, animation, scripted behavior, and platformer movement.

**The actual product being built here is the tool, not any one game.** The three games are how the tool's capabilities get proven out, but the end goal is: a wizard that guides you through creating a game, a publish flow that puts it live at its own route, and a hub page listing everything that's published. Keep that framing when a design choice could go either toward "make this one game work" or "make the next game easier to create" — prefer the latter once a pattern repeats.

This doc assumes the three games get built **inside bloobitygook**, as new apps sharing an extended `packages/engine`, the same pattern already used for `apps/play`/`apps/editor`. That's a default, not a locked decision — flag it if you want these somewhere else.

**Guiding principle, matching how the physics engine got built: grow the engine only as far as the next game actually needs.** Don't generalize a system until a second real use case demands it. Tetris needs blocking collision and composite objects — build exactly that, not a generic "collision framework." Pac-Man is what justifies generalizing triggers (line-clear and portals turn out to be the same shape) — that's the right moment to do it, not before.

## Prior art: what the old Python Tetris already solved

`valkirie/tetris/tetris.py` and `pieces.py` (Python/pygame prototype) solved this problem once already. Worth reusing the *ideas*, not the code — different language, and its collision model (binary AABB blocking) is architecturally different from bloobitygook's current physics (impulse-based bounce response):

- **Composite pieces**: a `Piece` is a parent `Object` with 3 child `Object`s; `PIECES` is a dict of 4 precomputed rotation states per piece type, each a tuple of relative offsets scaled by cell size. `rotate_piece()` just repositions children to the next state. Moving the parent moves all children via `Object.set_position`'s propagation. → maps directly to "composite/group entities" below.
- **Collision is a gate, not a response**: `horizontal_collision_detection`/`collision_detection` test an AABB rectangle *before* a move commits, returning true/false — nothing bounces. This is a second, distinct collision mode from what bloobitygook's `ballCollisionSystem` does today, and both need to coexist as separate systems.
- **Event chain on landing**: `on_collide` → `check_line` (scan a row, clear if full, shift everything above down) → `deactivate_objects` → `create_piece`. Hand-wired as Python methods there; in bloobitygook this is a good first candidate for a small declarative trigger/action pattern.
- **Stage config as data**: `self.stage = {"base-speed": 0.008}` — a tunable pulled out of code. Direct precedent for "game configuration with stages and scenes" below.

## New capabilities, in the order the three games force them

### For Tetris
1. **Generic shape archetypes** — rects/boxes, not just circles. Trivial (`createSvgElement("rect", ...)`), but the current entity vocabulary is ball-only.
2. **Composite/group entities** — a parent whose transform propagates to children, mirroring the Python `Piece`/`Object.set_position` pattern.
3. **Grid-based kinematic movement** — discrete cell steps instead of continuous integration.
4. **Action/intent system** — propose a move → test against the environment (settled blocks, walls) → commit or reject. This is the blocking-collision mode from the Python version, added alongside (not replacing) the existing bounce-collision mode.
5. **Row-completion trigger** — scan a row, clear + shift + score if full. Build this Tetris-specific first; don't generalize it yet.
6. **Score / game-state** — score, game over condition.
7. **Game configuration model** — `GameConfig` → one or more `Stage`s → one or more `Scene`s, each stage carrying tunables (speed, etc.). Extends today's flat `scene.json` into a small hierarchy.

### For Pac-Man (adds on top of Tetris's tooling)
8. **Sprite/frame animation** — an `animation` component (frame list + fps) and a system advancing/rendering the current frame. First moving-picture requirement; everything so far has been static shapes.
9. **Maze walls** — static blocking geometry, reusing the grid-collision system from #3/#4, generalized from "the floor is one full row" to "arbitrary wall layout from a maze grid."
10. **Portals/tunnels** — a zone that teleports an entity on entry. This is the second real use of "trigger" (after row-completion) — the point where generalizing into a small `triggers` system (zone + condition + action) actually pays for itself.
11. **Ghost behavior** — a minimal per-entity state machine (`chase`/`scatter`/`flee`, each mapping to a target-seeking movement rule) driving movement every tick, independent of player input.

### For the Mario vs. Donkey Kong platformer (adds on top of both prior)
12. **Platformer motor** — gravity + jump impulse + ground detection, ladders (vertical move, gravity suspended while climbing), one-way platforms, moving platforms that carry whatever's standing on them.
13. **Hazard/enemy behavior** — rolling barrels etc., reusing the behavior system from #11 with a new "patrol/roll downhill" rule.
14. **Goal/level-complete trigger** — reuses the trigger system from #10.

## Publishing, the hub, and per-game routes

**Game manifest in Storage**, mirroring the scene-publish pattern already built in `apps/editor/src/publish.js`: each game gets `games/<gameId>/manifest.json` — `{id, title, description, thumbnail, route, published, createdAt}`. A hub page lists games the same way `listPublishedScenes()` already lists scenes (`listAll()` on a prefix) — no database needed, same "Storage as a simple versioned repository" model already decided for scenes.

**One public Hosting site, path-based routes**, not a separate site per game:
```
/                -> apps/hub    (lists published games, reads the manifest)
/tetris/         -> apps/tetris
/pacman/         -> apps/pacman
/platformer/     -> apps/platformer
```
Each game app builds with a Vite `base` matching its route (`base: '/tetris/'`, etc.); a small compose step copies each app's `dist/` into `dist-site/<route>/` before a single `firebase deploy --only hosting:play` publishes all of them together. `apps/editor` stays on its own separate, non-public site — it's a dev tool, not part of the arcade.

**Two different "publish" actions, at two different layers** — worth keeping distinct rather than conflating:
- **Publishing a scene/level within an already-deployed game** (what exists today) is a pure client-side Storage write — no rebuild, no deploy, instant.
- **Publishing a new game** (or a code change to one) means a new route needs to exist and be built — that's a repo change, going through the existing CI (`deploy.yml`): the wizard scaffolds `apps/<newgame>/` and a manifest entry, you commit/push, CI builds and deploys it. The wizard is a generator, not a live-editing tool.

**Preview before publish**: manifest entries carry `published: false` until you're ready — the hub only lists `published: true` games, but the route/build can exist and be reachable (e.g. via a direct link from the editor) for you to check before flipping it live. Simple boolean, no separate staging environment needed yet.

## Editor architecture: introducing React

The editor is about to gain a multi-step creation wizard, multi-game management, and hub/publish controls — real UI state complexity that today's vanilla DOM wiring (`main.js` + `ui-helpers.js`) will fight as it grows. Scoping the change:

- **`packages/engine` and the new game-logic packages (`grid`, `triggers`, `animation`, `behavior`, `platformer`) stay plain, framework-agnostic ES modules.** The simulation doesn't know or care what's driving its UI, and every gameplay app (`play`, `tetris`, `pacman`, `platformer`) stays React-free — they're meant to be light, fast-loading players, and a component framework buys them nothing since they're just driving SVG imperatively at 60fps.
- **React goes only around `apps/editor`'s UI chrome**: the wizard, the property inspector, gravity/game config panels, and the new hub/publish management screen. This is exactly the kind of stateful, form-heavy, step-driven UI React is good at, and it's genuinely justified now (not premature) by the wizard + multi-game scope.

## Multiplayer (Level 2 preview — not built now)

Cloud Functions are a good fit for the non-realtime glue a future multiplayer layer would need — matchmaking, room creation, auth-gated writes, leaderboards — and Firebase deploys/bills functions individually and on-demand, so "only the functions a given game uses" is already how it works, no special setup required. They're a poor fit for the actual realtime simulation tick (request/response, not a persistent connection — cold-start and per-call latency don't work for 30-60 updates/sec of shared state). When Level 2 happens, the realtime layer itself will need either Firestore/Realtime-Database listeners (fine for turn-based or coarse position sync) or a dedicated persistent server (Cloud Run + WebSockets, or something like Colyseus) for anything as physics-heavy as the blob demo. Nothing to build yet — just keep `packages/engine`'s systems as pure functions over plain-JSON entity state (already true) so a future server-authoritative tick loop can reuse them directly.

## Proposed package/app shape

Grows incrementally — this is the target shape once the platform pieces and all three games exist, not something to scaffold up front:

```
packages/
  engine/       (existing — pure ECS core: world, svg, loop, scene, color; stays game-agnostic)
  physics/      (today's physics.js content, renamed/moved — continuous bounce physics, used only by the blob demo)
  grid/         (new, for Tetris — kinematic movement, blocking collision, composite/group entities)
  triggers/     (new, generalized once Pac-Man needs a second use — zone + condition + action)
  animation/    (new, for Pac-Man — sprite frames)
  behavior/     (new, for Pac-Man's ghosts; extended for platformer enemies)
  platformer/   (new, for the final game — gravity/jump/ladders/moving platforms)
  game-manifest/ (new — shared shape/helpers for games/<id>/manifest.json, used by hub + editor + wizard)

apps/
  play, editor      (existing — the blob physics demo; editor gains React chrome, see above)
  hub               (new — public games list, reads the manifest)
  tetris, pacman, platformer   (new)
```

## Build order

1. **Phase 0 — Tetris foundations** ✅ `packages/grid`: `collision.js` (`canPlace`/`checkCompleteRows`, pure), `cellGroup.js` (the falling composite piece — one entity, N rendered cells, reused DOM nodes across rotations), `block.js` (settled individual cells). Deviated from the original wording here: no separate "action system" or "game-configuration model" package built — Tetris's moves are just validated-mutation functions in the app itself, and its board is procedural (no authored content), so there's nothing to save as config yet. Revisit both once Pac-Man needs them for real.
2. **Phase 1 — Build Tetris** ✅ `apps/tetris` — piece rotation table ported from the Python prototype (verified: every rotation state is 4 non-overlapping cells, O-piece is rotation-invariant), gravity-tick drop, move/rotate/hard-lock, line-clear with correct row-shift (verified against a constructed scenario, not just unit tests), score, game over + restart. 51 tests passing across the workspace; not yet wired into any hosting route (that's Phase 2's job).
3. **Phase 2 — Platform foundations** 🟡 partial: `packages/game-manifest` (pure shape/defaults, no Firebase dep) ✅, `apps/hub` (public, unauthenticated `games/` manifest listing, gracefully empty when nothing's published) ✅, single-site path-based routing (`apps/play` → `/blob/`, `apps/tetris` → `/tetris/`, `apps/hub` → `/`, composed by `scripts/compose-site.mjs` into `dist-site/`, `firebase.json`'s `play` target repointed there) ✅ — verified locally by serving the actual composed output and confirming all three routes load with correct asset paths and no console errors. **Not yet built**: the wizard (scaffold-a-game-from-template UI) and the React editor migration — both deferred, since they're substantial enough to deserve their own pass rather than being squeezed in here. Nothing has actually been published to the hub yet either — there's no way to create a manifest entry until the wizard (or at least a "Publish Game" button) exists.
   - **Bug found via this verification, fixed**: `storage.rules` never had a rule for the `games/` path at all (only `scenes/`), so the hub's read was silently denied by Storage's implicit deny. Added `match /games/{allPaths=**} { allow read: if true; ... }`, same allowlist-on-write pattern as scenes. **This fix needs `firebase deploy --only storage` to actually take effect on the live project** — I haven't run that.
4. **Phase 3 — Pac-Man foundations**: `packages/animation`, generalize `packages/triggers` (row-clear + portals as its first two use cases), `packages/behavior` v1 (ghost state machine).
5. **Phase 4 — Build Pac-Man** on Phases 0–3, wired into the wizard/hub as a second template.
6. **Phase 5 — Platformer foundations**: `packages/platformer`, extend `packages/behavior` for enemies/hazards.
7. **Phase 6 — Build the platformer** on everything prior, third wizard template.

Each phase closes with the same checkpoint discipline used for the physics engine: Vitest unit tests for new package logic, then a manual browser parity pass for the app (mirroring how `packages/engine`/`apps/editor` were verified).

## Open decisions

- ~~Board scale~~ — resolved: classic 10×20 grid, 24px cells (240×480 board), own viewBox rather than reusing the blob demo's 800×600 — Tetris doesn't need that canvas size and a tighter board reads better.
- **Platformer fidelity**: how literal a "Mario vs. Donkey Kong" clone (specific level layouts, specific enemy types) vs. a generic platformer capability demo is the actual goal?
- **React tooling choice**: plain React + Vite's React plugin is the obvious default for `apps/editor`; flag now if you'd rather use something else (Preact for a lighter footprint, a meta-framework, etc.) before Phase 2 wiring starts.
