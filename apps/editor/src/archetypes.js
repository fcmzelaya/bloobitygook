import { ref, uploadString, getBytes, listAll } from "firebase/storage";
import { storage, assertCloudEnabled } from "./firebase-client.js";

// Archetypes are shared building blocks (like scenes), not a per-game
// publish gate (like games/) — public read, canEdit write, single-tier.
// Mirrors publish.js's scene functions exactly.
export async function publishArchetype(id, data) {
  assertCloudEnabled();
  const json = JSON.stringify(data, null, 2);
  await uploadString(ref(storage, `archetypes/${id}.json`), json, "raw", {
    contentType: "application/json",
  });
}

export async function fetchArchetype(id) {
  assertCloudEnabled();
  try {
    const bytes = await getBytes(ref(storage, `archetypes/${id}.json`));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export async function listArchetypes() {
  assertCloudEnabled();
  const result = await listAll(ref(storage, "archetypes"));
  return result.items.map((item) => item.name.replace(/\.json$/, ""));
}
