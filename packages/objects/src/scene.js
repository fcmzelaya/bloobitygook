import { clear, query, clearChildren } from "@bloobitygook/engine/core";
import { normalizeGravity } from "@bloobitygook/engine/physics";
import { instantiateObject, serializeObject } from "./instantiate.js";

// Scene load/save now needs to know about a game's object catalog (already
// narrowed to that game's own catalogIds), so this — not
// @bloobitygook/engine/scene.js — is the one place mapping a scene file's
// object entries to live entities and back. Query relaxed from the old
// ["entityType","x","y"] to ["catalogId"] since a grid-based object (a
// placed Tetris piece, say) has col/row, not x/y, and would otherwise be
// silently dropped from the saved file.
// catalogIds round-trips from the catalog itself (already narrowed to
// whatever a game enables) rather than needing to be threaded through as
// a separate argument — the catalog *is* the source of truth for which
// ids are enabled.
// `nextSceneId` (string | null | undefined) chains a game's scenes into a
// simple linked sequence — see packages/objects' README-equivalent
// (CLAUDE.md's "Scene navigation" note). Passed through as plain data,
// same as gravity/catalogIds; no logic lives here, only in whichever app
// actually advances on it (apps/scene-player, or the editor's
// switchScene).
export function serializeScene(world, gravity, catalog, nextSceneId = null) {
  const objects = query(world, ["catalogId"]).map((e) => serializeObject(catalog, e));
  const catalogIds = catalog.all().map((d) => d.id);
  return { version: 1, gravity, catalogIds, objects, nextSceneId };
}

export function loadScene(world, worldEl, sceneData, catalog) {
  clear(world);
  clearChildren(worldEl);
  for (const def of sceneData.objects ?? []) {
    if (!catalog.byId(def.type)) {
      console.warn(`Unknown object type "${def.type}" in scene file — skipped.`);
      continue;
    }
    instantiateObject(catalog, def.type, world, worldEl, def);
  }
  return normalizeGravity(sceneData.gravity);
}

// A scene predating this field (or one with no next scene) has none —
// `null`, not an empty string, so a caller can `if (nextSceneId)` cleanly.
export function nextSceneIdOf(sceneData) {
  return sceneData.nextSceneId ?? null;
}

// Which of a game's declared catalog ids to enable when the scene file
// doesn't say — absent means "ball only", matching every scene saved
// before catalogIds existed (including apps/editor/public/scenes/default.json).
export function catalogIdsOf(sceneData) {
  return sceneData.catalogIds ?? ["ball"];
}
