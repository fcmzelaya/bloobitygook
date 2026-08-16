# bloobitygook

A small custom SVG + vanilla JS physics playground/engine. See [CLAUDE.md](CLAUDE.md) for architecture details.

## Structure

- `packages/engine` — shared physics/ECS engine, zero build step, unit-tested.
- `apps/play` — light public build, ships with scenes baked in, no cloud dependency.
- `apps/editor` — full editor: Setup/Run modes, live property inspector, configurable gravity, local file save/open, and publishing scenes to a shared Cloud Storage bucket.

## Getting started

```bash
pnpm install
pnpm dev:play      # http://localhost:5175
pnpm dev:editor    # http://localhost:5176
pnpm test
pnpm build
```

Editor cloud features (publish/sign-in) need Firebase project config — copy `apps/editor/.env.example` to `apps/editor/.env` and fill in your Firebase web app config. Everything else (local editing, Save/Open, `apps/play`) works with no setup.
