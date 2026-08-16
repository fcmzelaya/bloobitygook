import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getStorage, ref, uploadString, getBytes, listAll } from "firebase/storage";

// True only when a Firebase project is actually configured (apps/editor/.env,
// see .env.example). Without it, cloud publish/load stay disabled and the
// rest of the editor — including local file Save/Open — works unaffected.
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

const auth = app ? getAuth(app) : null;
const storage = app ? getStorage(app) : null;
const provider = new GoogleAuthProvider();

function assertEnabled() {
  if (!isCloudEnabled) {
    throw new Error("Cloud publishing isn't configured — see apps/editor/.env.example.");
  }
}

export async function signIn() {
  assertEnabled();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    // Popup blockers are common enough to design around, not treat as
    // an edge case — fall back to a full-page redirect flow.
    if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
      await signInWithRedirect(auth, provider);
    } else {
      throw err;
    }
  }
}

export function signOut() {
  assertEnabled();
  return firebaseSignOut(auth);
}

// Calls cb(user | null) immediately and on every future auth change.
// When cloud isn't configured, calls cb(null) once and never again.
export function onAuthChange(cb) {
  if (!isCloudEnabled) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

// Publishing is an explicit, occasional action, not continuous sync — no
// live listener here, no concurrent-edit merge logic. Overwrites the
// canonical path each time; bucket-level Object Versioning (an infra
// setting, not app code) is what gives real publish history.
export async function publishScene(sceneId, data) {
  assertEnabled();
  const json = JSON.stringify(data, null, 2);
  await uploadString(ref(storage, `scenes/${sceneId}.json`), json, "raw", {
    contentType: "application/json",
  });
}

// No auth required — published scenes are public read (see storage.rules)
// so apps/play and anyone else can load them.
export async function fetchPublishedScene(sceneId) {
  assertEnabled();
  const bytes = await getBytes(ref(storage, `scenes/${sceneId}.json`));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function listPublishedScenes() {
  assertEnabled();
  const result = await listAll(ref(storage, "scenes"));
  return result.items.map((item) => item.name.replace(/\.json$/, ""));
}
