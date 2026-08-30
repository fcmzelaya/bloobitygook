import { useCallback, useEffect, useState } from "react";
import { useCloudAuth } from "../CloudAuthContext.jsx";
import { listArchetypes, fetchArchetype } from "../archetypes.js";
import { ArchetypeEditor } from "../components/ArchetypeEditor.jsx";

// A management screen for the no-code archetype system (see
// packages/objects/src/archetype.js): list what exists, create a new
// one, or edit an existing one — all in this one route rather than a
// separate URL per archetype, since the list is expected to stay small.
export function Archetypes() {
  const { isCloudEnabled, user } = useCloudAuth();
  const [ids, setIds] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); // null = list view, "" = new, else an existing id
  const [editingData, setEditingData] = useState(null);

  const refresh = useCallback(async () => {
    if (!isCloudEnabled) return;
    setIds(null);
    setError(null);
    try {
      setIds(await listArchetypes());
    } catch (err) {
      setError(err.message);
    }
  }, [isCloudEnabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = () => {
    setEditingId("");
    setEditingData(null);
  };

  const openExisting = async (id) => {
    setEditingId(id);
    setEditingData(await fetchArchetype(id));
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditingData(null);
    refresh();
  };

  if (!isCloudEnabled) {
    return (
      <div id="archetypes">
        <p>Cloud publishing isn't configured — see apps/editor/.env.example.</p>
      </div>
    );
  }

  return (
    <div id="archetypes">
      <h1>Archetypes</h1>
      <p className="editor-hint">
        Reusable object prototypes — default/required properties, a visual (a simple shape or an imported SVG), and
        behavior (static, a scripted pattern, or keyboard input). A game enables one by adding its id to that game's
        scene, the same way it enables a built-in object like Ball.
      </p>
      {editingId === null ? (
        <>
          {!user && <p className="editor-hint">Sign in to create or edit archetypes.</p>}
          {error && <div id="archetypes-error">Couldn't load archetypes: {error}</div>}
          {!error && ids === null && <p>Loading…</p>}
          {!error && ids?.length === 0 && <p>No archetypes yet.</p>}
          <ul id="archetypes-list">
            {ids?.map((id) => (
              <li key={id}>
                <button type="button" className="link-btn" onClick={() => openExisting(id)}>
                  {id}
                </button>
              </li>
            ))}
          </ul>
          {user && (
            <button id="new-archetype-btn" type="button" onClick={openNew}>
              New Archetype
            </button>
          )}
        </>
      ) : (
        <ArchetypeEditor id={editingId} initial={editingData} onDone={closeEditor} onCancel={closeEditor} />
      )}
    </div>
  );
}
