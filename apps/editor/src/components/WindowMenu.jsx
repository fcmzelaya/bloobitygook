import { useState, useSyncExternalStore } from "react";
import { windowManager, WINDOW_IDS } from "../window-manager.js";

// Window titles keyed the same way WINDOW_IDS names them — kept here
// rather than on each Window instance since this is the one place that
// needs every id's display name at once.
const WINDOW_LABELS = {
  "game-metadata": "Game Info",
  palette: "Palette",
  inspector: "Inspector",
  "scene-panel": "Scene",
};

// The "configurable" half of the floating-window system: a closed window
// is otherwise unreachable, and a badly-dragged layout needs an escape
// hatch. A single small dropdown rather than a persistent bar, since it's
// an occasional action, not a primary control.
export function WindowMenu() {
  const { visibility } = useSyncExternalStore(windowManager.subscribe, windowManager.getSnapshot);
  const [open, setOpen] = useState(false);

  return (
    <div id="window-menu">
      <button id="window-menu-btn" onClick={() => setOpen((v) => !v)} title="Show/hide panels, or reset their layout">
        Windows {open ? "▴" : "▾"}
      </button>
      {open && (
        <div id="window-menu-dropdown">
          {WINDOW_IDS.map((id) => (
            <label key={id} className="checkbox-row">
              <input type="checkbox" checked={visibility[id] ?? true} onChange={() => windowManager.toggleWindow(id)} />
              {WINDOW_LABELS[id] ?? id}
            </label>
          ))}
          <div id="window-menu-divider" />
          <button
            id="reset-layout-btn"
            onClick={() => windowManager.resetLayout()}
            title="Restore every window to its default position, size, and visibility"
          >
            Reset layout
          </button>
        </div>
      )}
    </div>
  );
}
