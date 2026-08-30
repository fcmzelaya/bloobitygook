// Pure logic pulled out of ArchetypeEditor.jsx so it's unit-testable
// without a browser or sign-in — mirrors ui-helpers.js's existing split
// between DOM-wiring and pure logic.

export function emptyArchetype(id) {
  return {
    id,
    label: "",
    category: "character",
    swatch: "#7ee08a",
    boundingRadius: 20,
    physics: { restitution: 0.5, friction: 0.3 },
    properties: [],
    visual: { kind: "shape", shape: "circle", fill: "#7ee08a" },
    behavior: { mode: "static" },
  };
}

// {key: {onPress, onRelease}} <-> an editable row array — object keys
// can't hold "" or be renamed in place while the user is mid-edit, so the
// form works in rows and only converts to the record's real shape on
// load/save.
export function inputMapToRows(inputMap) {
  return Object.entries(inputMap ?? {}).map(([key, binding]) => ({
    key,
    onPress: binding.onPress ?? "",
    onRelease: binding.onRelease ?? "",
  }));
}

export function rowsToInputMap(rows) {
  const inputMap = {};
  for (const row of rows) {
    if (!row.key) continue;
    inputMap[row.key] = { onPress: row.onPress || undefined, onRelease: row.onRelease || undefined };
  }
  return inputMap;
}

// True when a required property has no default to fall back to — used
// to disable Save rather than let spawnFromArchetype silently paper over
// it at spawn time.
export function hasRequiredPropertyMissingDefault(properties) {
  return properties.some((p) => p.required && (p.default === "" || p.default == null));
}
