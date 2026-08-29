import { useSyncExternalStore } from "react";
import * as engine from "../engine.js";

// Which object the next stage click places — grouped by category so a
// game with several object types (e.g. fertris's 7 Tetris pieces) reads
// as a set of small groups instead of one long button row. A sibling of
// Toolbar/Inspector (not nested in Toolbar, which is scoped to scene-wide
// controls only) since this is about *what* gets placed, not *how* the
// scene is being edited.
export function Palette() {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  const byCategory = new Map();
  for (const entry of snap.catalog) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category).push(entry);
  }

  return (
    <div id="palette">
      <div id="palette-hint" className="editor-hint">
        Click a button to arm it, then click the stage (in Setup mode) to place one.
      </div>
      {[...byCategory.entries()].map(([category, entries]) => (
        <div className="palette-group" key={category}>
          <div className="palette-group-label">{category}</div>
          {entries.map((entry) => (
            <button
              key={entry.id}
              className={`palette-btn${snap.armedId === entry.id ? " active" : ""}`}
              style={{ "--swatch": entry.swatch }}
              onClick={() => engine.setPaletteSelection(entry.id)}
              title={`Place a ${entry.label} on the next stage click`}
            >
              <span className="palette-swatch" />
              {entry.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
