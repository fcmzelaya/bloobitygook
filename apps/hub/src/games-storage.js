import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll, getBytes } from "firebase/storage";
import { isValidManifestEntry } from "@bloobitygook/game-manifest";

// Read-only, unauthenticated by design — storage.rules makes `games/`
// publicly readable, and the hub is meant to be reachable with zero
// setup, unlike the editor (which needs sign-in to publish anything).
export const isCloudEnabled = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

const app = isCloudEnabled
  ? initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
  : null;

const storage = app ? getStorage(app) : null;

// Each game lives at games/<id>/manifest.json — listAll() on the games/
// prefix returns one sub-prefix per game id (mirrors the scenes/ listing
// pattern already used by apps/editor/src/publish.js).
export async function fetchAllManifests() {
  if (!isCloudEnabled) return [];
  const result = await listAll(ref(storage, "games"));
  const manifests = await Promise.all(
    result.prefixes.map(async (prefix) => {
      try {
        const bytes = await getBytes(ref(storage, `${prefix.fullPath}/manifest.json`));
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return null; // no manifest.json under this prefix (yet), or it failed to parse
      }
    })
  );
  return manifests.filter(Boolean);
}

// Pure — the part actually worth unit testing without touching Firebase.
export function selectPublishedGames(manifests) {
  return manifests
    .filter(isValidManifestEntry)
    .filter((m) => m.published)
    .sort((a, b) => a.title.localeCompare(b.title));
}
