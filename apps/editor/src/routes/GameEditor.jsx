import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { fetchDraft, fetchGame } from "../games.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";
import { GameMetadataForm } from "../components/GameMetadataForm.jsx";
import { Stage } from "../components/Stage.jsx";
import { Toolbar } from "../components/Toolbar.jsx";
import { Inspector } from "../components/Inspector.jsx";

// Editing is always scoped to one game. The draft copy (canEdit's working
// area) wins over the public copy if both exist, since it represents
// whatever was last saved-but-not-published. Neither existing yet just
// means this is a brand-new listing for `gameId` — the form starts empty.
export function GameEditor({ gameId }) {
  const { isCloudEnabled, user } = useCloudAuth();
  const [manifest, setManifest] = useState(null); // null = still loading

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
      <GameMetadataForm initial={manifest} user={user} onSaved={(entry) => setManifest(entry)} />
      {manifest.sceneId ? (
        <div id="game-scene-editor">
          <Stage sceneId={manifest.sceneId} />
          <Toolbar sceneId={manifest.sceneId} />
          <Inspector />
        </div>
      ) : (
        <p id="no-scene-note">Scene editing isn't available for this game yet.</p>
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
