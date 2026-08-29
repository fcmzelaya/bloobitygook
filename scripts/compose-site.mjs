// Combines the hub + each game app's already-built dist/ into one
// deployable tree, dist-site/, matching the routes each app was built
// with (see the `base` option in each app's vite.config.js). Run after
// building every app — see the root package.json's "build" script.
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "dist-site");
const appsDir = path.join(root, "apps");

// Each app opts into the composed site by declaring its own route in
// package.json's "bloobitygook.route" field ("" means the site root) —
// discovered here rather than hand-maintained in a central list, so
// adding a new game app needs zero edits to this script. An app with no
// such field (apps/editor, which deploys to its own separate Hosting
// site) is simply not part of the composed tree.
function discoverApps() {
  const entries = [];
  for (const name of readdirSync(appsDir)) {
    const pkgPath = path.join(appsDir, name, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const route = pkg.bloobitygook?.route;
    if (route === undefined) continue;
    entries.push([name, route]);
  }
  return entries;
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

for (const [app, routePrefix] of discoverApps()) {
  const src = path.join(root, "apps", app, "dist");
  if (!existsSync(src)) {
    throw new Error(`apps/${app}/dist doesn't exist — build it before running compose-site.mjs`);
  }
  const dest = routePrefix ? path.join(outDir, routePrefix) : outDir;
  cpSync(src, dest, { recursive: true });
  console.log(`copied apps/${app}/dist -> dist-site/${routePrefix}`);
}
