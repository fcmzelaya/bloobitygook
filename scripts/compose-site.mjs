// Combines the hub + each game app's already-built dist/ into one
// deployable tree, dist-site/, matching the routes each app was built
// with (see the `base` option in each app's vite.config.js). Run after
// building apps/hub, apps/play, and apps/tetris — see the root
// package.json's "build" script.
import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "dist-site");

// [sourceApp, routePrefix] — routePrefix "" means "serve at the site root".
const APPS = [
  ["hub", ""],
  ["tetris", "tetris"],
  ["play", "blob"],
];

if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

for (const [app, routePrefix] of APPS) {
  const src = path.join(root, "apps", app, "dist");
  if (!existsSync(src)) {
    throw new Error(`apps/${app}/dist doesn't exist — build it before running compose-site.mjs`);
  }
  const dest = routePrefix ? path.join(outDir, routePrefix) : outDir;
  cpSync(src, dest, { recursive: true });
  console.log(`copied apps/${app}/dist -> dist-site/${routePrefix}`);
}
