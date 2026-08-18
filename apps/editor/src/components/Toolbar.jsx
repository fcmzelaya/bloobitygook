import { useState, useSyncExternalStore } from "react";
import * as engine from "../engine.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";

export function Toolbar({ onToggleGames, onToggleWizard }) {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { isCloudEnabled, user, signIn, signOut } = useCloudAuth();
  const [sceneId, setSceneId] = useState("default");

  const cloudClass = (base) => (isCloudEnabled ? base : [base, "hidden"].filter(Boolean).join(" "));

  return (
    <div id="toolbar">
      <button
        id="mode-setup-btn"
        className={snap.mode === "setup" ? "active" : ""}
        onClick={() => engine.setMode("setup")}
      >
        Setup
      </button>
      <button
        id="mode-run-btn"
        className={snap.mode === "running" ? "active" : ""}
        onClick={() => engine.setMode("running")}
      >
        Run
      </button>
      <div className="divider"></div>
      <button id="save-btn" onClick={() => engine.saveSceneToFile()}>Save Scene</button>
      <button id="open-btn" onClick={() => engine.openSceneFromFile()}>Open Scene</button>
      <div className="divider"></div>
      <select id="gravity-mode" value={snap.gravity.mode} onChange={(e) => engine.setGravityMode(e.target.value)}>
        <option value="uniform">Gravity: Earth</option>
        <option value="point">Gravity: Point</option>
      </select>
      <input
        id="gravity-magnitude"
        type="range"
        min="0"
        max="2000"
        step="10"
        value={snap.gravity.magnitude}
        onChange={(e) => engine.setGravityMagnitude(Number(e.target.value))}
        title="Gravity strength"
      />
      <button id="place-gravity-btn" disabled={!snap.placeGravityBtnEnabled} onClick={() => engine.armGravityPlacement()}>
        Place Point
      </button>

      <div className={cloudClass("divider")}></div>
      <input
        id="scene-id"
        className={cloudClass("")}
        type="text"
        value={sceneId}
        onChange={(e) => setSceneId(e.target.value)}
        placeholder="scene id"
      />
      <button
        id="publish-btn"
        className={cloudClass("")}
        disabled={!user}
        title="Sign in to publish"
        onClick={() => engine.publishCurrentScene(sceneId.trim() || "default")}
      >
        Publish
      </button>
      <button
        id="load-cloud-btn"
        className={cloudClass("")}
        onClick={() => engine.loadSceneFromCloud(sceneId.trim() || "default")}
      >
        Load from Cloud
      </button>
      <button id="games-btn" className={cloudClass("")} onClick={onToggleGames}>
        Manage Games
      </button>

      <div className="divider"></div>
      <button id="wizard-btn" onClick={onToggleWizard}>New Game</button>
      <button id="signin-btn" className={cloudClass("")} onClick={() => (user ? signOut() : signIn())}>
        {user ? `Sign out (${user.email})` : "Sign in"}
      </button>
      <span id="status">{snap.status}</span>
    </div>
  );
}
