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
      <div id="dashboard-intro">
        <p>
          This is bloobitygook's editor — the dev tool for building and publishing the games in this project. Every
          game gets a listing below; open one to edit its title/description/route, and if it has a visual scene,
          place and configure objects on its canvas.
        </p>
        <ul>
          <li><strong>New Game</strong> (top right) scaffolds a brand-new game as a real app, via a GitHub pull request — for starting something from scratch.</li>
          <li>To open an <em>existing</em> game, or start a metadata-only listing for one that already has code, type its id below and hit Open.</li>
          <li><strong>Draft</strong> is your private working copy; <strong>Publish</strong> makes it visible on the public hub. Publishing needs extra permission — Save Draft works for anyone signed in.</li>
        </ul>
        {!user && <p className="editor-hint">Sign in (top right) to see your drafts and save changes — the list below still works while signed out.</p>}
      </div>
      {error && <div id="dashboard-error">Couldn't load games: {error}</div>}
      {!error && games === null && <p>Loading…</p>}
      {!error && games?.length === 0 && (
        <p>No games published yet. {user ? "Open or create one by id below, or use New Game above." : "Sign in to create one."}</p>
      )}
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
        <div id="dashboard-new-section">
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
          <p className="editor-hint">
            An id that already exists opens it; a new one starts an empty listing you fill in on the next screen.
          </p>
        </div>
      )}
    </div>
  );
}
