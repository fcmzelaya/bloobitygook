// Pure transforms of *existing* shared file content — takes the current
// text (fetched from the repo at PR-creation time, not hardcoded here)
// and returns the updated text. Kept separate from github-wizard.js so
// these can be unit tested without touching the GitHub API at all.

export function addDevScriptToRootPackageJson(pkgJsonText, id) {
  const pkg = JSON.parse(pkgJsonText);
  pkg.scripts[`dev:${id}`] = `pnpm --filter @bloobitygook/${id} dev`;

  if (!pkg.scripts.build.includes("&& pnpm compose")) {
    throw new Error('Expected root package.json\'s "build" script to end with "&& pnpm compose"');
  }
  pkg.scripts.build = pkg.scripts.build.replace(
    "&& pnpm compose",
    `&& pnpm --filter @bloobitygook/${id} build && pnpm compose`
  );

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
