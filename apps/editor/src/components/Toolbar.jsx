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
        title="Freeze the physics so you can place and select objects"
      >
        Setup
      </button>
      <button
        id="mode-run-btn"
        className={snap.mode === "running" ? "active" : ""}
        onClick={() => engine.setMode("running")}
        title="Start the simulation — objects fall, collide, and bounce"
      >
        Run
      </button>
      <div className="divider"></div>
      <button id="save-btn" onClick={() => engine.saveSceneToFile()} title="Save this scene to a local file">
        Save Scene
      </button>
      <button id="open-btn" onClick={() => engine.openSceneFromFile()} title="Load a scene from a local file">
        Open Scene
      </button>
      <div className="divider"></div>
      <select
        id="gravity-mode"
        value={snap.gravity.mode}
        onChange={(e) => engine.setGravityMode(e.target.value)}
        title="How gravity pulls on objects in this scene"
      >
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
      <button
        id="place-gravity-btn"
        disabled={!snap.placeGravityBtnEnabled}
        onClick={() => engine.armGravityPlacement()}
        title="Click the stage to set where Point gravity pulls toward"
      >
        Place Point
      </button>

      {isCloudEnabled && (
        <>
          <div className="divider"></div>
          <button
            id="publish-btn"
            disabled={!user}
            title={!user ? "Sign in to publish" : "Make this scene the live version everyone loading this game sees"}
            onClick={() => engine.publishCurrentScene(sceneId)}
          >
            Publish Scene
          </button>
          <button
            id="load-cloud-btn"
            onClick={() => engine.loadSceneFromCloud(sceneId)}
            title="Replace what's on the stage with the last-published version"
          >
            Load from Cloud
          </button>
        </>
      )}
    </div>
  );
}
