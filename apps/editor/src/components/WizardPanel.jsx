import { useState } from "react";
import { createGithubClient, createGamePR } from "../github-wizard.js";
import { PIECE_TYPES } from "@bloobitygook/tetris-pieces";

const GITHUB_TOKEN_STORAGE_KEY = "bloobitygook:wizard:github-token";

export function WizardPanel({ visible }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [port, setPort] = useState("5181");
  const [gameType, setGameType] = useState("blank");
  const [cols, setCols] = useState("10");
  const [rows, setRows] = useState("20");
  const [cellSize, setCellSize] = useState("24");
  const [pieceSet, setPieceSet] = useState(() => new Set(PIECE_TYPES));
  const [dropIntervalMs, setDropIntervalMs] = useState("700");
  const [linesPerLevel, setLinesPerLevel] = useState("10");
  const [token, setToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) ?? "");
  const [status, setStatus] = useState(null); // { type: "error"|"info", text } | { type: "success", url }
  const [creating, setCreating] = useState(false);

  const canCreate =
    id.trim() && title.trim() && token.trim() && !creating && (gameType !== "tetris" || pieceSet.size > 0);

  const persistToken = () => localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);

  const forgetToken = () => {
    setToken("");
    localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
  };

  const togglePiece = (type) => {
    setPieceSet((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleCreate = async () => {
    const trimmedId = id.trim();
    if (!/^[a-z0-9-]+$/.test(trimmedId)) {
      setStatus({ type: "error", text: 'ID must be lowercase letters, numbers, or hyphens only (e.g. "pong").' });
      return;
    }

    setCreating(true);
    setStatus({ type: "info", text: "Creating branch and opening a pull request…" });
    try {
      const octokit = createGithubClient(token.trim());
      const prUrl = await createGamePR(octokit, {
        id: trimmedId,
        title: title.trim(),
        description: description.trim(),
        port: Number(port.trim()) || 5181,
        gameType,
        ...(gameType === "tetris" && {
          tetrisConfig: {
            cols: Number(cols) || 10,
            rows: Number(rows) || 20,
            cellSize: Number(cellSize) || 24,
            pieceSet: PIECE_TYPES.filter((t) => pieceSet.has(t)),
            dropIntervalMs: Number(dropIntervalMs) || 700,
            linesPerLevel: Number(linesPerLevel) || 10,
          },
        }),
      });
      setStatus({ type: "success", url: prUrl });
    } catch (err) {
      setStatus({ type: "error", text: `Failed: ${err.message}` });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div id="wizard-panel" className={visible ? "visible" : ""}>
      <h3>New Game</h3>
      <p className="hint">
        Scaffolds an app under apps/&lt;id&gt; and opens a GitHub PR — a starting shell, or a complete, configured
        Tetris instance.
      </p>
      <label>
        Game type
        <select id="wizard-game-type" value={gameType} onChange={(e) => setGameType(e.target.value)}>
          <option value="blank">Blank</option>
          <option value="tetris">Tetris</option>
        </select>
      </label>
      <label>
        ID (lowercase, no spaces)
        <input id="wizard-id" type="text" placeholder="pong" value={id} onChange={(e) => setId(e.target.value)} />
      </label>
      <label>
        Title
        <input id="wizard-title" type="text" placeholder="Pong" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Description
        <input
          id="wizard-description"
          type="text"
          placeholder="A paddle game"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label>
        Dev port
        <input id="wizard-port" type="text" value={port} onChange={(e) => setPort(e.target.value)} />
      </label>

      {gameType === "tetris" && (
        <div id="wizard-tetris-fields">
          <label>
            Columns
            <input id="wizard-cols" type="number" min="4" value={cols} onChange={(e) => setCols(e.target.value)} />
          </label>
          <label>
            Rows
            <input id="wizard-rows" type="number" min="4" value={rows} onChange={(e) => setRows(e.target.value)} />
          </label>
          <label>
            Cell size (px)
            <input
              id="wizard-cell-size"
              type="number"
              min="1"
              value={cellSize}
              onChange={(e) => setCellSize(e.target.value)}
            />
          </label>
          <fieldset id="wizard-piece-set">
            <legend>Pieces</legend>
            {PIECE_TYPES.map((type) => (
              <label key={type} className="piece-checkbox">
                <input
                  type="checkbox"
                  checked={pieceSet.has(type)}
                  onChange={() => togglePiece(type)}
                />
                {type.toUpperCase()}
              </label>
            ))}
          </fieldset>
          {pieceSet.size === 0 && <p className="hint error">Select at least one piece.</p>}
          <label>
            Drop speed (ms)
            <input
              id="wizard-drop-interval"
              type="number"
              min="100"
              value={dropIntervalMs}
              onChange={(e) => setDropIntervalMs(e.target.value)}
            />
          </label>
          <label>
            Lines per level
            <input
              id="wizard-lines-per-level"
              type="number"
              min="1"
              value={linesPerLevel}
              onChange={(e) => setLinesPerLevel(e.target.value)}
            />
          </label>
        </div>
      )}

      <label>
        GitHub token (repo-scoped, stored only in this browser)
        <input
          id="wizard-token"
          type="password"
          placeholder="github_pat_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onBlur={persistToken}
        />
      </label>
      <button id="forget-token-btn" type="button" onClick={forgetToken}>Forget saved token</button>
      <button id="create-pr-btn" disabled={!canCreate} onClick={handleCreate}>Create Pull Request</button>
      <div id="wizard-status">
        {status?.type === "success" && (
          <>
            Pull request opened:{" "}
            <a href={status.url} target="_blank" rel="noopener">
              {status.url}
            </a>
          </>
        )}
        {status && status.type !== "success" && status.text}
      </div>
    </div>
  );
}
