import { useState } from "react";
import { publishArchetype } from "../archetypes.js";
import { emptyArchetype, inputMapToRows, rowsToInputMap, hasRequiredPropertyMissingDefault } from "../archetype-form-helpers.js";
import { sanitizeSvg } from "@bloobitygook/svg-import";
import { ARCHETYPE_ACTIONS } from "@bloobitygook/platformer";

const ACTION_NAMES = Object.keys(ARCHETYPE_ACTIONS);
const BEHAVIOR_PRESETS = ["stationary", "patrol", "chase"];

// Created/edited entirely in the editor UI, no code file — see
// packages/objects/src/archetype.js for how this record gets interpreted
// at spawn time. Explicit per-section branches, no schema-driven form
// engine, matching Inspector.jsx's/WizardPanel.jsx's existing style.
export function ArchetypeEditor({ id, initial, onDone, onCancel }) {
  const isNew = id === "";
  const [form, setForm] = useState(() => initial ?? emptyArchetype(id));
  const [inputRows, setInputRows] = useState(() =>
    initial?.behavior?.mode === "input" ? inputMapToRows(initial.behavior.inputMap) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setPhysics = (patch) => setForm((f) => ({ ...f, physics: { ...f.physics, ...patch } }));
  const setVisual = (patch) => setForm((f) => ({ ...f, visual: { ...f.visual, ...patch } }));
  const setBehavior = (patch) => setForm((f) => ({ ...f, behavior: { ...f.behavior, ...patch } }));

  const addProperty = () =>
    set({ properties: [...form.properties, { name: "", default: 0, required: false }] });
  const updateProperty = (index, patch) =>
    set({ properties: form.properties.map((p, i) => (i === index ? { ...p, ...patch } : p)) });
  const removeProperty = (index) => set({ properties: form.properties.filter((_, i) => i !== index) });

  const addInputRow = () => setInputRows((rows) => [...rows, { key: "", onPress: "", onRelease: "" }]);
  const updateInputRow = (index, patch) =>
    setInputRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const removeInputRow = (index) => setInputRows((rows) => rows.filter((_, i) => i !== index));

  const setMode = (mode) => {
    if (mode === "scripted") setBehavior({ mode, preset: "stationary" });
    else if (mode === "input") {
      setBehavior({ mode, inputMap: rowsToInputMap(inputRows) });
    } else setBehavior({ mode: "static" });
  };

  const setVisualKind = (kind) => {
    if (kind === "svg") setVisual({ kind: "svg", svgMarkup: form.visual.svgMarkup ?? "" });
    else setVisual({ kind: "shape", shape: "circle", fill: form.swatch });
  };

  const requiredMissingDefault = hasRequiredPropertyMissingDefault(form.properties);
  const canSave = form.id.trim() && form.label.trim() && !saving && !requiredMissingDefault;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const record = {
        ...form,
        id: form.id.trim(),
        behavior: form.behavior.mode === "input" ? { ...form.behavior, inputMap: rowsToInputMap(inputRows) } : form.behavior,
        visual: form.visual.kind === "svg" ? { ...form.visual, svgMarkup: sanitizeSvg(form.visual.svgMarkup) } : form.visual,
      };
      await publishArchetype(record.id, record);
      onDone(record);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="archetype-editor">
      <label>
        ID (lowercase, no spaces)
        <input
          id="archetype-id"
          type="text"
          placeholder="goblin"
          value={form.id}
          disabled={!isNew}
          onChange={(e) => set({ id: e.target.value })}
        />
      </label>
      <label>
        Label
        <input id="archetype-label" type="text" placeholder="Goblin" value={form.label} onChange={(e) => set({ label: e.target.value })} />
      </label>
      <label>
        Category
        <input
          id="archetype-category"
          type="text"
          placeholder="character"
          value={form.category}
          onChange={(e) => set({ category: e.target.value })}
        />
      </label>
      <label>
        Swatch
        <input id="archetype-swatch" type="color" value={form.swatch} onChange={(e) => set({ swatch: e.target.value })} />
      </label>
      <label>
        Bounding radius (the collision shape — always circular, even with an SVG visual)
        <input
          id="archetype-radius"
          type="number"
          min="1"
          value={form.boundingRadius}
          onChange={(e) => set({ boundingRadius: Number(e.target.value) || 1 })}
        />
      </label>
      <label>
        Restitution (bounciness)
        <input
          id="archetype-restitution"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={form.physics.restitution}
          onChange={(e) => setPhysics({ restitution: Number(e.target.value) })}
        />
      </label>
      <label>
        Friction
        <input
          id="archetype-friction"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={form.physics.friction}
          onChange={(e) => setPhysics({ friction: Number(e.target.value) })}
        />
      </label>

      <fieldset id="archetype-properties">
        <legend>Properties</legend>
        <p className="editor-hint">Arbitrary named values (moveSpeed, health, anything a game needs) with a default and whether it's required.</p>
        {form.properties.map((prop, i) => (
          <div className="property-row" key={i}>
            <input type="text" placeholder="name" value={prop.name} onChange={(e) => updateProperty(i, { name: e.target.value })} />
            <input
              type="number"
              placeholder="default"
              value={prop.default}
              onChange={(e) => updateProperty(i, { default: Number(e.target.value) })}
            />
            <label className="checkbox-row">
              <input type="checkbox" checked={prop.required} onChange={(e) => updateProperty(i, { required: e.target.checked })} />
              required
            </label>
            <button type="button" onClick={() => removeProperty(i)}>&times;</button>
          </div>
        ))}
        <button type="button" onClick={addProperty}>Add property</button>
      </fieldset>

      <fieldset id="archetype-visual">
        <legend>Visual</legend>
        <label className="checkbox-row">
          <input type="radio" checked={form.visual.kind === "shape"} onChange={() => setVisualKind("shape")} />
          Simple shape
        </label>
        <label className="checkbox-row">
          <input type="radio" checked={form.visual.kind === "svg"} onChange={() => setVisualKind("svg")} />
          Imported SVG
        </label>
        {form.visual.kind === "shape" && (
          <>
            <label>
              Shape
              <select value={form.visual.shape} onChange={(e) => setVisual({ shape: e.target.value })}>
                <option value="circle">Circle</option>
                <option value="rect">Rectangle</option>
              </select>
            </label>
            <label>
              Fill
              <input type="color" value={form.visual.fill} onChange={(e) => setVisual({ fill: e.target.value })} />
            </label>
          </>
        )}
        {form.visual.kind === "svg" && (
          <>
            <label>
              Paste SVG markup
              <textarea
                id="archetype-svg-markup"
                rows={4}
                value={form.visual.svgMarkup}
                onChange={(e) => setVisual({ svgMarkup: e.target.value })}
              />
            </label>
            <p className="editor-hint">Cleaned up automatically on save — scripts, event handlers, and external references are stripped. Animation isn't supported for an imported-SVG visual yet.</p>
            <div
              id="archetype-svg-preview"
              dangerouslySetInnerHTML={{ __html: `<svg viewBox="-25 -25 50 50">${sanitizeSvg(form.visual.svgMarkup || "")}</svg>` }}
            />
          </>
        )}
      </fieldset>

      <fieldset id="archetype-behavior">
        <legend>Behavior</legend>
        <label>
          Mode
          <select value={form.behavior.mode} onChange={(e) => setMode(e.target.value)}>
            <option value="static">Static (no behavior)</option>
            <option value="scripted">Script-programmed (a preset pattern)</option>
            <option value="input">Subject to inputs (typed keys)</option>
          </select>
        </label>
        {form.behavior.mode === "scripted" && (
          <>
            <label>
              Pattern
              <select value={form.behavior.preset} onChange={(e) => setBehavior({ preset: e.target.value })}>
                {BEHAVIOR_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>{preset}</option>
                ))}
              </select>
            </label>
            {form.behavior.preset === "patrol" && (
              <>
                <label>
                  Range (px either side of its start point)
                  <input type="number" min="1" value={form.behavior.range ?? 80} onChange={(e) => setBehavior({ range: Number(e.target.value) })} />
                </label>
                <label>
                  Speed
                  <input type="number" min="1" value={form.behavior.speed ?? 100} onChange={(e) => setBehavior({ speed: Number(e.target.value) })} />
                </label>
              </>
            )}
            {form.behavior.preset === "chase" && (
              <label>
                Speed
                <input type="number" min="1" value={form.behavior.speed ?? 100} onChange={(e) => setBehavior({ speed: Number(e.target.value) })} />
              </label>
            )}
          </>
        )}
        {form.behavior.mode === "input" && (
          <div id="archetype-input-map">
            <p className="editor-hint">Which typed key does what — one row per key.</p>
            {inputRows.map((row, i) => (
              <div className="input-row" key={i}>
                <input type="text" placeholder="ArrowLeft" value={row.key} onChange={(e) => updateInputRow(i, { key: e.target.value })} />
                <select value={row.onPress} onChange={(e) => updateInputRow(i, { onPress: e.target.value })}>
                  <option value="">(on press: none)</option>
                  {ACTION_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select value={row.onRelease} onChange={(e) => updateInputRow(i, { onRelease: e.target.value })}>
                  <option value="">(on release: none)</option>
                  {ACTION_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeInputRow(i)}>&times;</button>
              </div>
            ))}
            <button type="button" onClick={addInputRow}>Add key</button>
          </div>
        )}
      </fieldset>

      {requiredMissingDefault && <p className="editor-hint error">Every required property needs a default value.</p>}
      {error && <div id="archetype-form-error">{error}</div>}
      <div className="form-actions">
        <button id="archetype-cancel-btn" type="button" onClick={onCancel}>Cancel</button>
        <button id="archetype-save-btn" type="button" disabled={!canSave} onClick={handleSave}>
          {isNew ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}
