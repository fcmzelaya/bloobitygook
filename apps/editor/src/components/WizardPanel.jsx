import { useState } from "react";
import { createGithubClient, createGamePR } from "../github-wizard.js";

const GITHUB_TOKEN_STORAGE_KEY = "bloobitygook:wizard:github-token";

export function WizardPanel({ visible }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [port, setPort] = useState("5181");
  const [token, setToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) ?? "");
  const [status, setStatus] = useState(null); // { type: "error"|"info", text } | { type: "success", url }
  const [creating, setCreating] = useState(false);

  const canCreate = id.trim() && title.trim() && token.trim() && !creating;

  const persistToken = () => localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);

  const forgetToken = () => {
    setToken("");
    localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
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
        Scaffolds a minimal app under apps/&lt;id&gt; and opens a GitHub PR — it's a starting shell, not a finished game.
      </p>
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
