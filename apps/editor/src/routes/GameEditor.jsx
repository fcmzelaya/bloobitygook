import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams } from "react-router";
import { fetchDraft, fetchGame } from "../games.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";
import { GameMetadataForm } from "../components/GameMetadataForm.jsx";
import { Stage } from "../components/Stage.jsx";
import { Toolbar } from "../components/Toolbar.jsx";
import { Palette } from "../components/Palette.jsx";
import { Inspector } from "../components/Inspector.jsx";
import { ScenePanel } from "../components/ScenePanel.jsx";
import { Window } from "../components/Window.jsx";
import { WindowMenu } from "../components/WindowMenu.jsx";
import { DockOverlay } from "../components/DockOverlay.jsx";
import { windowManager } from "../window-manager.js";
import { computeDockLayout } from "../dock-layout.js";
import { TOP_INSET } from "../layout-constants.js";

// First-run default rects (a user's own drag/resize/dock takes over from
// here on, persisted per window id — see window-manager.js). Chosen to
// spread out as a non-overlapping starting point; the exact pixels
// aren't load-bearing. Toolbar isn't here — it's a permanent top bar now
// (see the JSX below), not part of the window/dock system.
const DEFAULT_RECTS = {
  "game-metadata": { position: { x: 12, y: TOP_INSET }, size: { width: 280, height: 360 } },
  palette: { position: { x: 304, y: TOP_INSET }, size: { width: 460, height: 170 } },
  "scene-panel": { position: { x: 304, y: TOP_INSET + 180 }, size: { width: 460, height: 280 } },
  inspector: { position: { x: 780, y: TOP_INSET }, size: { width: 240, height: 340 } },
};

// Recomputed on browser resize so docked windows keep filling their
// column/row correctly rather than only reacting to the next drag.
function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

// Editing is always scoped to one game. The draft copy (canEdit's working
// area) wins over the public copy if both exist, since it represents
// whatever was last saved-but-not-published. Neither existing yet just
// means this is a brand-new listing for `gameId` — the form starts empty.
export function GameEditor({ gameId }) {
  const { isCloudEnabled, user } = useCloudAuth();
  const [manifest, setManifest] = useState(null); // null = still loading
  const { visibility, dock } = useSyncExternalStore(windowManager.subscribe, windowManager.getSnapshot);
  const viewport = useViewportSize();
  const dockLayout = computeDockLayout(dock, viewport.width, viewport.height);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isCloudEnabled) {
        if (!cancelled) setManifest({ id: gameId });
        return;
      }
      // Unauthenticated reads of drafts/ are rejected by storage.rules
      // (canEdit-only) — skip the attempt entirely when signed out rather
      // than relying on fetchDraft's catch-and-return-null to mask a 403.
      const draft = user ? await fetchDraft(gameId) : null;
      const found = draft ?? (await fetchGame(gameId));
      if (!cancelled) setManifest(found ?? { id: gameId });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [gameId, isCloudEnabled, user]);

  if (manifest === null) {
    return (
      <div id="game-editor">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div id="game-editor">
      {manifest.sceneId && <Toolbar sceneId={manifest.sceneId} />}
      {manifest.sceneId && <WindowMenu />}
      {manifest.sceneId && <DockOverlay />}

      {visibility["game-metadata"] && (
        <Window
          id="game-metadata"
          title="Game Info"
          defaultPosition={DEFAULT_RECTS["game-metadata"].position}
          defaultSize={DEFAULT_RECTS["game-metadata"].size}
          dock={dock["game-metadata"]}
          dockedRect={dockLayout["game-metadata"]}
          onClose={() => windowManager.toggleWindow("game-metadata")}
        >
          <GameMetadataForm initial={manifest} user={user} onSaved={(entry) => setManifest(entry)} />
        </Window>
      )}

      {manifest.sceneId ? (
        <div id="game-scene-editor">
          <Stage sceneId={manifest.sceneId} />

          {visibility.palette && (
            <Window
              id="palette"
              title="Palette"
              defaultPosition={DEFAULT_RECTS.palette.position}
              defaultSize={DEFAULT_RECTS.palette.size}
              dock={dock.palette}
              dockedRect={dockLayout.palette}
              onClose={() => windowManager.toggleWindow("palette")}
            >
              <Palette />
            </Window>
          )}

          {visibility.inspector && (
            <Window
              id="inspector"
              title="Inspector"
              defaultPosition={DEFAULT_RECTS.inspector.position}
              defaultSize={DEFAULT_RECTS.inspector.size}
              dock={dock.inspector}
              dockedRect={dockLayout.inspector}
              onClose={() => windowManager.toggleWindow("inspector")}
            >
              <Inspector />
            </Window>
          )}

          {visibility["scene-panel"] && (
            <Window
              id="scene-panel"
              title="Scene"
              defaultPosition={DEFAULT_RECTS["scene-panel"].position}
              defaultSize={DEFAULT_RECTS["scene-panel"].size}
              dock={dock["scene-panel"]}
              dockedRect={dockLayout["scene-panel"]}
              onClose={() => windowManager.toggleWindow("scene-panel")}
            >
              <ScenePanel sceneId={manifest.sceneId} />
            </Window>
          )}
        </div>
      ) : (
        <p id="no-scene-note">
          This game has no Scene ID set, so there's no visual canvas to edit here — set one above (any short name,
          e.g. "default") to enable it, or leave it blank if this game's logic is entirely hand-coded (like Tetris or
          Pac-Man).
        </p>
      )}
    </div>
  );
}

// Keys the whole subtree by gameId so navigating between games fully
// unmounts/remounts GameEditor (and, when present, Stage) rather than
// relying on effect-dependency reasoning to reset the engine singleton.
export function GameEditorRoute() {
  const { gameId } = useParams();
  return <GameEditor key={gameId} gameId={gameId} />;
}
