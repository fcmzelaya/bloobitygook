// Pure — separated from the Cloud Function handler so the path-matching
// logic (which decides whether a Storage write should trigger a rebuild,
// and which excludes games/index.json itself so the function never
// re-triggers on its own output) is unit-testable without the Storage
// emulator or the Admin SDK at all.
const MANIFEST_RE = /^games\/([^/]+)\/manifest\.json$/;

function isManifestPath(filePath) {
  return MANIFEST_RE.test(filePath);
}

module.exports = { MANIFEST_RE, isManifestPath };
