import { useSyncExternalStore } from "react";
import * as engine from "../engine.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";

// Scene-editing controls only — mode, local save/open, gravity, and
// cloud publish/load for the current game's scene. Cloud/game-management
// concerns (sign-in, game listing, the New Game wizard) now live in
// AppHeader/Dashboard, since this toolbar only ever renders inside a
// single game's canvas view.
export function Toolbar({ sceneId }) {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { isCloudEnabled, user } = useCloudAuth();

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

      {isCloudEnabled && (
        <>
          <div className="divider"></div>
          <button
            id="publish-btn"
            disabled={!user}
            title={!user ? "Sign in to publish" : undefined}
            onClick={() => engine.publishCurrentScene(sceneId)}
          >
            Publish Scene
          </button>
          <button id="load-cloud-btn" onClick={() => engine.loadSceneFromCloud(sceneId)}>
            Load from Cloud
          </button>
        </>
      )}
    </div>
  );
}
