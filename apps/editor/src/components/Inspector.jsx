import { useSyncExternalStore } from "react";
import * as engine from "../engine.js";

export function Inspector() {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const selected = snap.selected;

  return (
    <div id="inspector" className={selected ? "visible" : ""}>
      <h3>
        Ball <span id="inspector-close" className="close-btn" onClick={() => engine.clearSelection()}>&times;</span>
      </h3>
      {selected && (
        <>
          <label>
            Radius
            <input
              id="prop-radius"
              type="number"
              min="4"
              max="120"
              step="1"
              value={selected.radius}
              onChange={(e) => engine.updateSelectedProp("radius", Number(e.target.value) || selected.radius)}
            />
          </label>
          <label>
            Color
            <input
              id="prop-color"
              type="color"
              value={selected.color}
              onChange={(e) => engine.updateSelectedProp("color", e.target.value)}
            />
          </label>
          <label>
            Restitution (elasticity)
            <input
              id="prop-restitution"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={selected.restitution}
              onChange={(e) => engine.updateSelectedProp("restitution", Number(e.target.value))}
            />
          </label>
          <label>
            Friction
            <input
              id="prop-friction"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={selected.friction}
              onChange={(e) => engine.updateSelectedProp("friction", Number(e.target.value))}
            />
          </label>
          <button id="delete-btn" onClick={() => engine.deleteSelected()}>Delete</button>
        </>
      )}
    </div>
  );
}
