import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

// Shared Firebase bootstrap — initializeApp() throws if called twice for
// the same app name, so every module that needs auth/storage (publish.js
// for scenes, games.js for game manifests) imports the instances from
// here instead of each creating its own.
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

export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

const provider = new GoogleAuthProvider();

export function assertCloudEnabled() {
  if (!isCloudEnabled) {
    throw new Error("Cloud publishing isn't configured — see apps/editor/.env.example.");
  }
}

export async function signIn() {
  assertCloudEnabled();
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
  assertCloudEnabled();
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
