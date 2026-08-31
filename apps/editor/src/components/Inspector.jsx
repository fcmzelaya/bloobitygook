import { useSyncExternalStore } from "react";
import * as engine from "../engine.js";
import { SPAWNER_STRATEGIES } from "@bloobitygook/objects";

function BallFields({ selected }) {
  return (
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
    </>
  );
}

// A spawner's own "category" field names which OTHER catalog category it
// draws from — distinct from a normal entity's fixed definition category,
// which is why it's editable here at all.
function SpawnerFields({ selected, catalog }) {
  const categories = [...new Set(catalog.filter((d) => d.category !== "tool").map((d) => d.category))];
  const typesInCategory = catalog.filter((d) => d.category === selected.category);

  const setCategory = (category) => {
    engine.updateSelectedProp("category", category);
    engine.updateSelectedProp(
      "allowedTypes",
      catalog.filter((d) => d.category === category).map((d) => d.id)
    );
  };

  const toggleType = (id) => {
    const next = selected.allowedTypes.includes(id)
      ? selected.allowedTypes.filter((t) => t !== id)
      : [...selected.allowedTypes, id];
    engine.updateSelectedProp("allowedTypes", next);
  };

  return (
    <>
      <label>
        Spawns from
        <select id="prop-spawner-category" value={selected.category ?? ""} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>Allowed types</label>
      {typesInCategory.map((def) => (
        <label key={def.id} className="checkbox-row">
          <input
            type="checkbox"
            checked={selected.allowedTypes.includes(def.id)}
            onChange={() => toggleType(def.id)}
          />
          {def.label}
        </label>
      ))}
      <label>
        Strategy
        <select
          id="prop-spawner-strategy"
          value={selected.strategy}
          onChange={(e) => engine.updateSelectedProp("strategy", e.target.value)}
        >
          {SPAWNER_STRATEGIES.map((strategy) => (
            <option key={strategy} value={strategy}>
              {strategy}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

// Covers any archetype instance uniformly (character, platform, goal, ...)
// — keyed on `selected.stats` existing at all, not on a category string,
// so it's collision-free with SpawnerFields' `"tool"` check no matter what
// category name a user picks for their own archetype.
function StatsFields({ selected }) {
  const names = Object.keys(selected.stats);
  if (names.length === 0) return <p className="editor-hint">No stats on this object.</p>;
  return (
    <div id="inspector-stats">
      {names.map((name) => (
        <label key={name}>
          {name}
          <input
            type="number"
            value={selected.stats[name]}
            onChange={(e) => engine.updateSelectedStat(name, Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  );
}

export function Inspector() {
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const selected = snap.selected;

  // Always rendered now that the outer floating chrome is a generic
  // Window (see routes/GameEditor.jsx) — visibility is the user's own
  // choice via the Windows menu, not something selection state should
  // collapse out from under them. A placeholder hint fills the empty
  // state instead of hiding the whole panel.
  return (
    <div id="inspector">
      {selected && (
        <h3>
          {selected.label}
          <span id="inspector-close" className="close-btn" onClick={() => engine.clearSelection()}>&times;</span>
        </h3>
      )}
      {selected ? (
        <>
          {selected.catalogId === "ball" && <BallFields selected={selected} />}
          {selected.definitionCategory === "tool" && <SpawnerFields selected={selected} catalog={snap.catalog} />}
          {selected.stats !== undefined && <StatsFields selected={selected} />}
          <button id="delete-btn" onClick={() => engine.deleteSelected()}>Delete</button>
        </>
      ) : (
        <p className="editor-hint">Select an object on the stage to edit it.</p>
      )}
    </div>
  );
}
