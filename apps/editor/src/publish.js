import { ref, uploadString, getBytes, listAll } from "firebase/storage";
import { storage, assertCloudEnabled } from "./firebase-client.js";

export { isCloudEnabled, signIn, signOut, onAuthChange } from "./firebase-client.js";

// Publishing is an explicit, occasional action, not continuous sync — no
// live listener here, no concurrent-edit merge logic. Overwrites the
// canonical path each time; bucket-level Object Versioning (an infra
// setting, not app code) is what gives real publish history.
export async function publishScene(sceneId, data) {
  assertCloudEnabled();
  const json = JSON.stringify(data, null, 2);
  await uploadString(ref(storage, `scenes/${sceneId}.json`), json, "raw", {
    contentType: "application/json",
  });
}

// No auth required — published scenes are public read (see storage.rules)
// so apps/play and anyone else can load them.
export async function fetchPublishedScene(sceneId) {
  assertCloudEnabled();
  const bytes = await getBytes(ref(storage, `scenes/${sceneId}.json`));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function listPublishedScenes() {
  assertCloudEnabled();
  const result = await listAll(ref(storage, "scenes"));
  return result.items.map((item) => item.name.replace(/\.json$/, ""));
}
