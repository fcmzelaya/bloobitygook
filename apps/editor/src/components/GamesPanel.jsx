import { useState, useCallback, useEffect } from "react";
import { publishGame, listGames } from "../games.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";
import * as engine from "../engine.js";

const EMPTY_FORM = { id: "", title: "", description: "", route: "", published: false };

export function GamesPanel({ visible }) {
  const { user } = useCloudAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [games, setGames] = useState(null); // null = not loaded yet
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setGames(null);
    setError(null);
    try {
      setGames(await listGames());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSave = async () => {
    if (!user) return;
    try {
      const game = await publishGame(form);
      engine.setStatus(`Saved game listing "${game.title}"`);
      refresh();
    } catch (err) {
      engine.setStatus(`Save game failed: ${err.message}`);
    }
  };

  return (
    <div id="games-panel" className={visible ? "visible" : ""}>
      <h3>Games</h3>
      <label>
        ID (used in the route)
        <input id="game-id" type="text" placeholder="tetris" value={form.id} onChange={setField("id")} />
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
      <div className="checkbox-row">
        <input id="game-published" type="checkbox" checked={form.published} onChange={setField("published")} />
        <label htmlFor="game-published">Published (visible on the hub)</label>
      </div>
      <button id="save-game-btn" disabled={!user} title="Sign in to publish" onClick={handleSave}>
        Save Game Listing
      </button>
      <div id="games-list">
        {error && `Couldn't load games: ${error}`}
        {!error && games === null && "Loading…"}
        {!error && games?.length === 0 && "No games published yet."}
        {!error &&
          games?.map((game) => (
            <div key={game.id} onClick={() => setForm({ ...EMPTY_FORM, ...game })}>
              {game.title} — {game.published ? "published" : "draft"}
            </div>
          ))}
      </div>
    </div>
  );
}
