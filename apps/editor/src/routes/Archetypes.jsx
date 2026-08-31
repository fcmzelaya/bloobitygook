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
  // undefined = still fetching an existing archetype's data; null = either
  // "new" (no data by design) or fetched-and-genuinely-missing; an object
  // once loaded. Distinct from null so the editor never mounts on a
  // still-in-flight fetch — see openExisting's comment below.
  const [editingData, setEditingData] = useState(undefined);

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
    setEditingData(null); // a genuinely blank form is correct here, not "still loading"
  };

  // ArchetypeEditor's form state is seeded from `initial` only once, in a
  // useState initializer (it has to be — the fields are editable, so it
  // can't just re-derive from props every render). That means it must not
  // mount at all until the real data has arrived: mounting it early with
  // `initial=null` while this fetch is in flight would seed the form
  // blank, and the later, correct data arriving as a prop update would be
  // silently ignored — editing an existing archetype would open (and
  // save, if you didn't notice) as if it were brand new. `editingData`
  // stays `undefined` for exactly that in-flight window so the render
  // below can gate on it.
  const openExisting = async (id) => {
    setEditingId(id);
    setEditingData(undefined);
    const data = await fetchArchetype(id);
    setEditingData(data ?? null);
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditingData(undefined);
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
      ) : editingData === undefined ? (
        <p>Loading…</p>
      ) : (
        <ArchetypeEditor key={editingId} id={editingId} initial={editingData} onDone={closeEditor} onCancel={closeEditor} />
      )}
    </div>
  );
}
