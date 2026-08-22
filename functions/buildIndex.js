// Pure — separated from the Admin SDK plumbing in index.js so the
// aggregation logic (parse each manifest, skip unreadable ones without
// failing the whole rebuild, shape the output) is unit-testable without
// the Storage emulator (which needs a local Java install) at all.
function buildGamesIndex(rawManifestTexts, now = new Date()) {
  const games = rawManifestTexts
    .map((text) => {
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error("Skipping unreadable manifest:", err);
        return null;
      }
    })
    .filter(Boolean);

  return { generatedAt: now.toISOString(), games };
}

module.exports = { buildGamesIndex };
