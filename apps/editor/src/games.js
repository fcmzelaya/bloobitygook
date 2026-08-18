import { ref, uploadString, getBytes, listAll } from "firebase/storage";
import { storage, assertCloudEnabled } from "./firebase-client.js";
import { createManifestEntry } from "@bloobitygook/game-manifest";

// Same shape as apps/hub/src/games-storage.js's reads, but this side can
// write too (behind sign-in + the storage.rules allowlist) — this is the
// minimal "publish a game" flow standing in for the real wizard, which
// deserves its own pass rather than a rushed multi-step UI here.
export async function publishGame(fields) {
  assertCloudEnabled();
  const entry = createManifestEntry(fields);
  const json = JSON.stringify(entry, null, 2);
  await uploadString(ref(storage, `games/${entry.id}/manifest.json`), json, "raw", {
    contentType: "application/json",
  });
  return entry;
}

export async function fetchGame(id) {
  assertCloudEnabled();
  try {
    const bytes = await getBytes(ref(storage, `games/${id}/manifest.json`));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export async function listGames() {
  assertCloudEnabled();
  const result = await listAll(ref(storage, "games"));
  const manifests = await Promise.all(result.prefixes.map((prefix) => fetchGame(prefix.name)));
  return manifests.filter(Boolean);
}
