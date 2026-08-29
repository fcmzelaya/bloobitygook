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
