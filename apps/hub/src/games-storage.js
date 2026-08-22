import { isValidManifestEntry } from "@bloobitygook/game-manifest";

// Read-only, unauthenticated by design, and now SDK-free: games/index.json
// is a public-read object (see storage.rules), maintained by the
// Storage-triggered Cloud Function in functions/index.js, which
// regenerates it from every games/<id>/manifest.json whenever one is
// written. The hub fetches that single aggregate instead of doing its own
// listAll()+getBytes() fan-out, so it never needs the Firebase SDK at all.
export const isCloudEnabled = Boolean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);

const BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;

// A 404 means the function hasn't fired yet (or nothing's ever been
// published) — treated the same as "cloud disabled": an empty list, not a
// thrown error. Real fetch/parse failures still propagate so main.js's
// catch-and-report path can surface them.
export async function fetchAllManifests() {
  if (!isCloudEnabled) return [];
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/games%2Findex.json?alt=media`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to fetch games index: ${res.status}`);
  const data = await res.json();
  return data.games ?? [];
}

// Pure — the part actually worth unit testing without touching Firebase.
export function selectPublishedGames(manifests) {
  return manifests
    .filter(isValidManifestEntry)
    .filter((m) => m.published)
    .sort((a, b) => a.title.localeCompare(b.title));
}
