import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { listGamesForEditor } from "../games.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";

// The editor's landing view: every game (published, plus drafts once
// signed in), each linking into its own /:gameId editing view. Games are
// never created here directly — type an id and hit "Open" to navigate to
// its (possibly brand-new) editing view, where GameMetadataForm handles
// the actual first save.
export function Dashboard() {
  const { isCloudEnabled, user } = useCloudAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);
  const [newId, setNewId] = useState("");

  const refresh = useCallback(async () => {
    if (!isCloudEnabled) return;
    setGames(null);
    setError(null);
    try {
      setGames(await listGamesForEditor(user));
    } catch (err) {
      setError(err.message);
    }
  }, [isCloudEnabled, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openId = (id) => {
    const trimmed = id.trim();
    if (/^[a-z0-9-]+$/.test(trimmed)) navigate(`/${trimmed}`);
  };

  if (!isCloudEnabled) {
    return (
      <div id="dashboard">
        <p>Cloud publishing isn't configured — see apps/editor/.env.example.</p>
      </div>
    );
  }

  return (
    <div id="dashboard">
      <h1>Games</h1>
      {error && <div id="dashboard-error">Couldn't load games: {error}</div>}
      {!error && games === null && <p>Loading…</p>}
      {!error && games?.length === 0 && <p>No games yet.</p>}
      <ul id="dashboard-games-list">
        {games?.map((game) => (
          <li key={game.id}>
            <Link to={`/${game.id}`} id={`edit-${game.id}`}>
              {game.title || game.id}
            </Link>
            {" — "}
            {game.published ? "published" : "draft"}
            {game.hasDraft && game.published ? " (unpublished changes)" : ""}
          </li>
        ))}
      </ul>
      {user && (
        <div id="dashboard-new-listing">
          <label>
            Open or create a game listing by id
            <input
              id="dashboard-new-id"
              type="text"
              placeholder="pong"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
            />
          </label>
          <button id="dashboard-open-btn" onClick={() => openId(newId)}>Open</button>
        </div>
      )}
    </div>
  );
}
