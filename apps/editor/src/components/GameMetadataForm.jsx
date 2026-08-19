import { useState } from "react";
import { saveDraft, publishGame } from "../games.js";
import { canPublish } from "../permissions.js";

const EMPTY_FORM = { id: "", title: "", description: "", route: "", sceneId: "", published: false };

// The metadata half of a game's manifest — id/title/description/route/
// sceneId/published. Always rendered by GameEditor for the game at the
// current route; the canvas (Stage/Toolbar/Inspector) is a sibling that
// only appears once a sceneId has been saved here. `initial.id` is always
// supplied by GameEditor (from the route's gameId, whether or not a
// manifest exists yet for it), so the id field is read-only here — to
// edit a different game's id, navigate to that game instead.
export function GameMetadataForm({ initial, user, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initial,
    sceneId: initial?.sceneId ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const userCanPublish = canPublish(user);

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSave = async (publish) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const fields = { ...form, sceneId: form.sceneId.trim() || null };
      const entry = publish ? await publishGame(fields) : await saveDraft(fields);
      onSaved?.(entry, { published: publish });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="game-metadata-form">
      <label>
        ID (set by the route)
        <input id="game-id" type="text" value={form.id} disabled />
      </label>
      <label>
        Title
        <input id="game-title" type="text" placeholder="Tetris" value={form.title} onChange={setField("title")} />
      </label>
      <label>
        Description
        <input
          id="game-description"
          type="text"
          placeholder="Classic falling blocks"
          value={form.description}
          onChange={setField("description")}
        />
      </label>
      <label>
        Route
        <input id="game-route" type="text" placeholder="/tetris/" value={form.route} onChange={setField("route")} />
      </label>
      <label>
        Scene ID (optional — enables canvas editing below)
        <input
          id="game-scene-id"
          type="text"
          placeholder="default"
          value={form.sceneId}
          onChange={setField("sceneId")}
        />
      </label>
      <div className="checkbox-row">
        <input
          id="game-published"
          type="checkbox"
          checked={form.published}
          onChange={setField("published")}
          disabled={!userCanPublish}
        />
        <label htmlFor="game-published">Published (visible on the hub)</label>
      </div>
      {error && <div id="game-form-error">{error}</div>}
      <div className="form-actions">
        <button
          id="save-draft-btn"
          disabled={!user || saving}
          title={!user ? "Sign in to save" : undefined}
          onClick={() => handleSave(false)}
        >
          Save Draft
        </button>
        <button
          id="publish-game-btn"
          disabled={!userCanPublish || saving}
          title={!userCanPublish ? "You don't have permission to publish" : undefined}
          onClick={() => handleSave(true)}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
