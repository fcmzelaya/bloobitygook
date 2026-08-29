import { useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router";
import * as engine from "../engine.js";
import { useCloudAuth } from "../CloudAuthContext.jsx";

// App-wide, always mounted regardless of route: sign-in status, the
// current game's engine status text (blank when no game is open), a
// breadcrumb back to the dashboard, and the New Game (GitHub PR wizard)
// trigger — none of these are specific to scene-editing, so they no
// longer live inside Toolbar.
export function AppHeader({ onOpenWizard }) {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { isCloudEnabled, user, signIn, signOut } = useCloudAuth();
  const location = useLocation();

  return (
    <div id="app-header">
      <span id="app-title" title="bloobitygook's dev tool for building and publishing games">
        bloobitygook editor
      </span>
      {location.pathname !== "/" && (
        <Link id="dashboard-link" to="/">
          &larr; Dashboard
        </Link>
      )}
      <span id="status">{snap.status}</span>
      <div id="app-header-actions">
        <button
          id="wizard-btn"
          onClick={onOpenWizard}
          title="Scaffold a brand-new game as a real app, via a GitHub pull request"
        >
          New Game
        </button>
        {isCloudEnabled && (
          <button
            id="signin-btn"
            onClick={() => (user ? signOut() : signIn())}
            title={user ? undefined : "Sign in to see your drafts and save changes"}
          >
            {user ? `Sign out (${user.email})` : "Sign in"}
          </button>
        )}
      </div>
    </div>
  );
}
