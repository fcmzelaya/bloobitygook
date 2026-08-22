const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const { isManifestPath, MANIFEST_RE } = require("./manifestPath.js");
const { buildGamesIndex } = require("./buildIndex.js");

initializeApp();

// Storage-triggered (Eventarc under the hood — no manual Pub/Sub setup):
// any write to games/<id>/manifest.json regenerates one aggregated
// games/index.json, so apps/hub can do a single plain fetch instead of a
// listAll()+getBytes() fan-out. Runs under the Admin SDK, which bypasses
// storage.rules entirely, so no rules changes are needed for this to
// write a public-read path.
exports.rebuildGamesIndex = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  if (!isManifestPath(filePath)) return;

  const bucket = getStorage().bucket(event.data.bucket);
  const [files] = await bucket.getFiles({ prefix: "games/" });

  const rawManifestTexts = await Promise.all(
    files
      .filter((f) => MANIFEST_RE.test(f.name))
      .map(async (f) => {
        try {
          const [buf] = await f.download();
          return buf.toString("utf8");
        } catch (err) {
          console.error(`Skipping unreadable manifest at ${f.name}:`, err);
          return "null"; // parses to null in buildGamesIndex, filtered out
        }
      })
  );

  await bucket
    .file("games/index.json")
    .save(JSON.stringify(buildGamesIndex(rawManifestTexts)), {
      contentType: "application/json",
      metadata: { cacheControl: "public, max-age=60" },
    });
});
