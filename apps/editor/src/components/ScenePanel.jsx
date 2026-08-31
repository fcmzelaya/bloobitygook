import { useEffect, useState, useSyncExternalStore } from "react";
import * as engine from "../engine.js";
import { STANDARD_DEFINITIONS } from "@bloobitygook/objects";
import { listArchetypes } from "../archetypes.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";

// Scene-level (not object-level) concerns, combined behind one panel
// rather than two competing new UI surfaces: which built-ins/archetypes
// this scene enables (Objects), and how this scene connects to others
// (Flow). Needs live engine.js access via useSyncExternalStore, same as
// Toolbar/Palette/Inspector — that's why this isn't folded into
// GameMetadataForm, which only talks to games.js's draft/publish world.
export function ScenePanel({ sceneId }) {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { isCloudEnabled, user } = useCloudAuth();
  const [archetypeIds, setArchetypeIds] = useState([]);
  const [newSceneId, setNewSceneId] = useState("");
  const [goToId, setGoToId] = useState("");

  useEffect(() => {
    if (!isCloudEnabled) return;
    let cancelled = false;
    listArchetypes()
      .then((ids) => {
        if (!cancelled) setArchetypeIds(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isCloudEnabled, snap.catalogIds.join(",")]);

  const availableIds = [
    ...STANDARD_DEFINITIONS.map((d) => ({ id: d.id, label: d.label ?? d.id, category: d.category })),
    ...archetypeIds
      .filter((id) => !STANDARD_DEFINITIONS.some((d) => d.id === id))
      .map((id) => ({ id, label: id, category: "archetype" })),
  ];

  const byCategory = new Map();
  for (const entry of availableIds) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category).push(entry);
  }

  const toggleId = (id) => {
    const enabled = new Set(snap.catalogIds);
    if (enabled.has(id)) enabled.delete(id);
    else enabled.add(id);
    engine.setCatalogIds([...enabled]);
  };

  const canLinkScenes = isCloudEnabled && Boolean(user);

  return (
    <div id="scene-panel">
      <fieldset id="scene-panel-objects">
        <legend>Objects in this scene</legend>
        <p className="editor-hint">Which built-ins/archetypes this scene's Palette offers.</p>
        {[...byCategory.entries()].map(([category, entries]) => (
          <div className="palette-group" key={category}>
            <div className="palette-group-label">{category}</div>
            {entries.map((entry) => (
              <label key={entry.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={snap.catalogIds.includes(entry.id)}
                  onChange={() => toggleId(entry.id)}
                />
                {entry.label}
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      <fieldset id="scene-panel-flow">
        <legend>Flow</legend>
        <p className="editor-hint">
          Scene: <strong>{snap.sceneId ?? sceneId}</strong> — Next scene:{" "}
          <strong>{snap.nextSceneId ?? "(none)"}</strong>
        </p>
        <div className="form-row">
          <input
            type="text"
            placeholder="scene id to jump to"
            value={goToId}
            onChange={(e) => setGoToId(e.target.value)}
          />
          <button type="button" disabled={!goToId.trim()} onClick={() => engine.switchScene(goToId.trim())}>
            Go
          </button>
        </div>
        <div className="form-row">
          <input
            type="text"
            placeholder="new scene id"
            value={newSceneId}
            onChange={(e) => setNewSceneId(e.target.value)}
            disabled={!canLinkScenes}
          />
          <button
            type="button"
            disabled={!canLinkScenes || !newSceneId.trim()}
            title={!canLinkScenes ? "Sign in to create and link a new scene" : undefined}
            onClick={() => {
              engine.createLinkedScene(newSceneId.trim());
              setNewSceneId("");
            }}
          >
            New (linked as next)
          </button>
        </div>
      </fieldset>
    </div>
  );
}
