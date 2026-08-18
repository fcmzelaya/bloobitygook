# bloobitygook

A small SVG + vanilla JS game engine and the games built on it. The actual product is the tool — a shared ECS engine, a growing set of small game-logic packages, an in-browser editor with a GitHub-PR-based game-creation wizard, and a public hub listing whatever's been published. See [docs/games-roadmap.md](docs/games-roadmap.md) for the full plan and [CLAUDE.md](CLAUDE.md) for architecture notes (currently being refreshed to match the structure below).

## Structure

```
packages/
  engine/         shared ECS core + the original ball-physics demo's systems
  grid/           tile-based collision, composite pieces (built for Tetris)
  triggers/       generic condition -> action (Tetris line-clear, Pac-Man portals)
  animation/      frame-based sprite animation (SVG attribute swaps)
  behavior/       generic state machine + seek/flee movement (ghost AI)
  game-manifest/  shape/helpers for a published game's games/<id>/manifest.json

apps/
  play/     light public build of the original blob-physics demo — /blob/
  tetris/   full game — /tetris/
  pacman/   full game — /pacman/
  hub/      public list of published games, reads Storage — /
  editor/   the dev tool: scene editor, cloud publish, "Manage Games" panel,
            and the "New Game" wizard (scaffolds an app, opens a GitHub PR)
```

Each game app builds with its own Vite `base` path and gets composed into one deployable `dist-site/` by `scripts/compose-site.mjs` — see the routes above.

## Getting started

```bash
pnpm install
pnpm dev:play      # http://localhost:5175
pnpm dev:editor    # http://localhost:5176
pnpm dev:tetris    # http://localhost:5178
pnpm dev:hub       # http://localhost:5179
pnpm dev:pacman    # http://localhost:5182
pnpm test          # every workspace package's test suite
pnpm build          # builds every app and composes dist-site/
```

Editor cloud features (scene/game publishing, sign-in, the wizard's GitHub PR flow) need config:
- Copy `apps/editor/.env.example` to `apps/editor/.env` and fill in your Firebase web app config, for publish/sign-in.
- The wizard needs a GitHub personal access token, entered directly in its panel (stored only in `localStorage`, never in `.env`).

Everything else — local scene editing, Save/Open, and every game app (`play`, `tetris`, `pacman`) — works with no setup at all.
