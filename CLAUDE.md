# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

bloobitygook is a small custom SVG + vanilla JS physics playground/engine — a starting point for experimenting with SVG-based browser games. Currently one demo: click-to-drop balls with gravity, restitution, friction, ball-vs-ball collision, and squash/stretch deformation, with a Setup/Run editor split and local file save/load.

No build step, no dependencies — plain ES modules loaded directly by the browser.

Unrelated to the Unity `Valkirie` project in a sibling repo — this is its own standalone prototype, not a component of that engine.

## Running it

```bash
python -m http.server <port> --directory <this dir>
```

(or use the server configured in `.claude/launch.json`). Then open the served `index.html`. It needs a real HTTP origin, not `file://` — ES module imports and `fetch("./scenes/default.json")` both require it.

## Architecture

Entity/component pattern, no framework: entities are plain objects (`{id, ...fields}`), components are just fields on them, systems are plain functions that `query(world, [...fields])` and mutate matches. See `src/engine/world.js`.

- `engine/world.js` — `createWorld`, `spawn`, `destroy`, `query`, `clear`.
- `engine/svg.js` — tiny DOM helpers (`createSvgElement`, `setAttrs`, `clearChildren`); the only place that touches `document.createElementNS`.
- `engine/loop.js` — `requestAnimationFrame` loop; dt is clamped so a dropped/backgrounded frame doesn't teleport entities.
- `engine/physics.js` — all simulation systems, called in this order from `main.js`'s `update(dt)`:
  1. `gravitySystem` — `gravity` is `{mode: "uniform"|"point", magnitude, x, y}`. Uniform adds straight down; point pulls toward `(x,y)` at constant magnitude (deliberately not inverse-square, so the same slider is comparable between modes).
  2. `integrateSystem` — semi-implicit Euler position update.
  3. `collisionSystem` — floor/wall bounds; reflects velocity by `restitution`, damps tangential velocity by `friction`.
  4. `ballCollisionSystem` — ball-vs-ball. Broad-phased with a uniform grid (cell size ≈ 2× the largest ball on scene) so it's not an O(n²) pairwise scan; narrow phase is a standard impulse-based elastic collision with mass ∝ radius² (area, uniform density).
  5. `deformationSystem` — a spring pulling `scaleX`/`scaleY` back toward 1. Collisions inject velocity into `scaleVelX`/`scaleVelY` (`applyImpact` for the directional wall/floor squash, `applyIsotropicImpact` for ball-ball hits since that contact normal isn't axis-aligned).
  6. `renderSystem` — the only system that touches the DOM; everything upstream is pure data mutation.
- `engine/scene.js` — `serializeScene`/`loadScene`. Scene files are JSON, not YAML (no extra library needed, and it round-trips natively through the File System Access API). `SPAWNERS` maps a scene object's `type` string to its spawn function — adding a new object type is one entry here plus a new `spawnX()` in `game/`, nothing else. Gravity is normalized on load so older scene files with a bare number still work.
- `engine/fileio.js` — wraps `showSaveFilePicker`/`showOpenFilePicker` (Chrome/Edge) with a download-link / `<input type=file>` fallback for browsers without File System Access. `saveScene` accepts an existing file handle so repeat saves overwrite in place instead of re-prompting.
- `game/ball.js` — the one entity type so far. Spawns a `<g><circle></g>` pair; the group (`el`) gets the transform, the circle (`circleEl`) gets `r`/`fill` written directly so the inspector panel can edit radius/color live.
- `main.js` — wires everything together: DOM refs, event handlers, and the two states below.

## Setup vs. Running

`mode` is `"setup"` or `"running"`, toggled from the toolbar. In `setup`, `update()` is a no-op — nothing moves, so objects can be placed and edited. Clicking empty stage spawns and selects a new ball; clicking an existing ball selects it instead (hit-tested by distance-to-center, last-spawned wins on overlap). The inspector panel (top-right) edits the selected ball's radius/color/restitution/friction live; Delete removes it from both `world` and the DOM. Switching to `running` clears the selection and starts the physics systems ticking each frame.

## Gravity

The toolbar dropdown switches `gravity.mode` between `uniform` (default, "Earth") and `point`. In point mode, "Place Point" arms a one-shot click-to-place on the stage (`placingGravityPoint`); the marker (`#gravity-marker` in the SVG) is purely visual, `pointer-events: none`. The same `gravity` object is what gets written into saved scene files.

## Coordinate system

SVG `viewBox="0 0 800 600"`, y grows downward. `bounds = {floorY: 560, left: 0, right: 800}` is a constant in `main.js` — not yet per-scene configurable.

## Known gaps

- Only one object type (`ball`) — no walls/platforms/other placeable shapes yet.
- No drag-to-move for placed objects; position only changes via spawn point or loaded scene data.
- No undo.
- Not tested on touch/mobile input — pointer events should mostly work but haven't been verified there.
