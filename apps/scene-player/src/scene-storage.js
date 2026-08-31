// Zero Firebase SDK, mirroring apps/hub/src/games-storage.js exactly —
// public, read-only Storage access via a plain fetch against the bucket's
// public download URL, keeping this gameplay app as dependency-light as
// play/tetris/pacman/goop already are.
export const isCloudEnabled = Boolean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);

const BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;

function storageUrl(path) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

// Prefers the published cloud copy, falling back to a local file under
// public/ for a scene that only exists locally (e.g. this app's own proof
// slice) — the same fallback shape as apps/editor's engine.js
// loadSceneData, so this app is usable without cloud credentials too.
export async function fetchScene(sceneId) {
  if (isCloudEnabled) {
    const res = await fetch(storageUrl(`scenes/${sceneId}.json`), { cache: "no-store" });
    if (res.ok) return res.json();
  }
  const res = await fetch(`./scenes/${sceneId}.json`);
  if (!res.ok) throw new Error(`No published or local scene "${sceneId}"`);
  return res.json();
}

// Matches loadSceneWithArchetypes' expected shape: a missing/offline
// archetype resolves to null rather than throwing, so a scene referencing
// one still loads (minus that object) instead of failing outright. Same
// cloud-then-local fallback as fetchScene above.
export async function fetchArchetype(id) {
  try {
    if (isCloudEnabled) {
      const res = await fetch(storageUrl(`archetypes/${id}.json`), { cache: "no-store" });
      if (res.ok) return await res.json();
    }
    const res = await fetch(`./archetypes/${id}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
