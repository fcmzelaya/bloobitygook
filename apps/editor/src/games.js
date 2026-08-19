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

// Draft manifests live under drafts/games/ — canEdit's working area,
// gated separately from the public games/ path in storage.rules (editing
// a draft never makes it visible on apps/hub; only publishGame() does).
export async function saveDraft(fields) {
  assertCloudEnabled();
  const entry = createManifestEntry(fields);
  const json = JSON.stringify(entry, null, 2);
  await uploadString(ref(storage, `drafts/games/${entry.id}/manifest.json`), json, "raw", {
    contentType: "application/json",
  });
  return entry;
}

export async function fetchDraft(id) {
  assertCloudEnabled();
  try {
    const bytes = await getBytes(ref(storage, `drafts/games/${id}/manifest.json`));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// The dashboard's list: published games merged with drafts. Drafts are
// only fetched when a user is signed in — an unauthenticated visitor
// can't read drafts/games/ per storage.rules, so there's no point
// attempting (and logging) a call that would just 403.
export async function listGamesForEditor(user) {
  assertCloudEnabled();
  const published = await listGames();
  if (!user) return published.map((game) => ({ ...game, hasDraft: false }));

  const draftResult = await listAll(ref(storage, "drafts/games"));
  const draftIds = new Set(draftResult.prefixes.map((prefix) => prefix.name));

  const byId = new Map(published.map((game) => [game.id, { ...game, hasDraft: draftIds.has(game.id) }]));
  const draftOnlyIds = [...draftIds].filter((id) => !byId.has(id));
  const draftOnlyEntries = await Promise.all(draftOnlyIds.map((id) => fetchDraft(id)));
  for (const entry of draftOnlyEntries.filter(Boolean)) {
    byId.set(entry.id, { ...entry, hasDraft: true, published: false });
  }

  return [...byId.values()];
}
