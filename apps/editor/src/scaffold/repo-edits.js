// Pure transforms of *existing* shared file content — takes the current
// text (fetched from the repo at PR-creation time, not hardcoded here)
// and returns the updated text. Kept separate from github-wizard.js so
// these can be unit tested without touching the GitHub API at all.

// The root "build" script (`pnpm --filter "./apps/*" -r run build && pnpm
// compose`) already discovers every apps/* workspace package dynamically,
// so a new game needs no per-app edit there — this only adds its `dev:<id>`
// convenience script.
export function addDevScriptToRootPackageJson(pkgJsonText, id) {
  const pkg = JSON.parse(pkgJsonText);
  pkg.scripts[`dev:${id}`] = `pnpm --filter @bloobitygook/${id} dev`;
  return JSON.stringify(pkg, null, 2) + "\n";
}

// Inserts a new ["<id>", "<id>"] entry into compose-site.mjs's APPS array,
// right before its closing bracket. Throws rather than silently no-op-ing
// if the anchors it expects aren't found — a script this file rewrites
// having drifted out from under it should fail loudly, not corrupt it.
export function addAppToComposeScript(source, id) {
  const arrayStart = source.indexOf("const APPS = [");
  if (arrayStart === -1) {
    throw new Error("Couldn't find \"const APPS = [\" in compose-site.mjs");
  }
  const closeAnchor = "\n];";
  const closeIndex = source.indexOf(closeAnchor, arrayStart);
  if (closeIndex === -1) {
    throw new Error("Couldn't find the end of the APPS array in compose-site.mjs");
  }
  const insertion = `\n  ["${id}", "${id}"],`;
  return source.slice(0, closeIndex) + insertion + source.slice(closeIndex);
}
