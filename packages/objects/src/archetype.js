import { spawn, createSvgElement } from "@bloobitygook/engine/core";
import { sanitizeSvg } from "@bloobitygook/svg-import";
import { createBehavior, BEHAVIOR_PRESETS } from "@bloobitygook/behavior";

// A user-authored archetype (created/edited entirely in the editor UI, no
// code file) is data, not a bespoke spawn function — this is the one
// generic interpreter every archetype goes through, formalizing the same
// open-stat-bag idea packages/objects/src/definitions/character.js
// already established. `archetypeToDefinition` below is the only thing
// that touches the catalog — createCatalog/instantiateObject/
// serializeObject/scene.js need no changes to support this.

// A missing (or missing-required) property falls back to the archetype's
// own default rather than throwing — a stale/hand-edited archetype record
// must never crash a scene load. `required` is enforced by the editor
// form when saving an archetype, not here.
function statsFromProperties(properties, overrides = {}) {
  const stats = {};
  for (const prop of properties ?? []) {
    stats[prop.name] = overrides[prop.name] ?? prop.default;
  }
  return stats;
}

// A rect visual normally draws a `boundingRadius`-sized square (the
// collision shape stays circular regardless — see the doc comment on
// `boundingRadius` in the editor form). `platformSize` is the one
// exception: a platform archetype's footprint is genuinely rectangular
// (wide and thin, not square), so its rect visual matches that instead —
// otherwise a platform would render as a square the size of its bounding
// circle, nothing like its actual shape.
function spawnShapeVisual(worldEl, { shape, fill }, radius, platformSize) {
  let el;
  if (shape === "rect" && platformSize) {
    const { width, height } = platformSize;
    el = createSvgElement("rect", { x: -width / 2, y: -height / 2, width, height, fill });
  } else if (shape === "rect") {
    el = createSvgElement("rect", { x: -radius, y: -radius, width: radius * 2, height: radius * 2, fill });
  } else {
    el = createSvgElement("circle", { r: radius, fill });
  }
  worldEl.appendChild(el);
  // Same node for el/circleEl, no wrapper — renderSystem's transform and
  // animationSystem's frame-attribute swaps both always target
  // entity.el, so a separate wrapper would put those writes on different
  // elements (see definitions/character.js for the same reasoning).
  return { el, circleEl: el };
}

// An imported SVG's actual shape becomes the visual — needs a <g> wrapper
// (unlike the bare-circle trick above) since it can hold several
// heterogeneous child shapes. renderSystem's transform already just
// targets entity.el regardless of tag, so this needs no engine change.
// Animation is deliberately unsupported for this visual kind: a single
// frame's attribute-set has no one element to apply to once the visual
// is multiple child shapes — see CLAUDE.md / the archetype editor, which
// hides animation fields when visual.kind is "svg".
//
// Re-sanitized here even though the stored record should already be
// clean from import time — never trust a stored string as pre-clean, in
// case a record was hand-edited or corrupted (defense in depth).
function spawnSvgVisual(worldEl, { svgMarkup }) {
  const el = createSvgElement("g");
  const clean = sanitizeSvg(svgMarkup);
  const parsed = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${clean}</svg>`,
    "image/svg+xml"
  );
  const parseFailed = parsed.getElementsByTagName("parsererror").length > 0;
  if (!parseFailed) {
    for (const child of Array.from(parsed.documentElement.childNodes)) {
      el.appendChild(document.importNode(child, true));
    }
  }
  worldEl.appendChild(el);
  // No single circle to expose — ball-specific consumers (e.g. the
  // editor's radius/color sync) already gate on catalogId === "ball"
  // before touching circleEl, so archetype instances never reach that path.
  return { el, circleEl: null };
}

function buildVisual(worldEl, visual, radius, platformSize) {
  if (visual.kind === "svg") return spawnSvgVisual(worldEl, visual);
  if (visual.kind === "shape") return spawnShapeVisual(worldEl, visual, radius, platformSize);
  throw new Error(`Unsupported visual kind "${visual.kind}"`);
}

// "scripted" wires up a real packages/behavior state machine, picked by
// name from BEHAVIOR_PRESETS (a config addition, never a code change, per
// the standing no-hardcoded-logic rule). "input" is deliberately NOT
// stored under `entity.behavior` — behaviorSystem queries every entity
// with a `behavior` field and calls stepBehavior on it assuming a real
// {states,current} state machine, so an input-mode entity's key map gets
// its own `entity.inputMap` field instead, keeping the two modes from
// colliding on one field with two incompatible shapes. `player: true`
// mirrors apps/pacman's existing `movable: true` tag idiom — it's what
// lets a "chase" preset elsewhere find the player generically.
function attachBehavior(entity, behaviorConfig) {
  if (!behaviorConfig || behaviorConfig.mode === "static") return;

  if (behaviorConfig.mode === "scripted") {
    const buildStates = BEHAVIOR_PRESETS[behaviorConfig.preset];
    if (!buildStates) throw new Error(`Unknown behavior preset "${behaviorConfig.preset}"`);
    const states = buildStates(behaviorConfig);
    entity.behavior = createBehavior(states, Object.keys(states)[0]);
    return;
  }

  if (behaviorConfig.mode === "input") {
    entity.player = true;
    entity.inputMap = behaviorConfig.inputMap ?? {};
    return;
  }

  throw new Error(`Unknown behavior mode "${behaviorConfig.mode}"`);
}

export function spawnFromArchetype(world, worldEl, def, archetype) {
  const { x, y, vx = 0, vy = 0 } = def;
  const radius = archetype.boundingRadius;
  const { restitution = 0.5, friction = 0.3, dynamic = true, platformSize } = archetype.physics ?? {};
  const stats = statsFromProperties(archetype.properties, def.stats);

  const { el, circleEl } = buildVisual(worldEl, archetype.visual, radius, platformSize);

  const entity = spawn(world, {
    entityType: "archetypeInstance",
    // Omitted entirely (not just set to false) when the archetype opts
    // out of physics — packages/engine's query() matches on field
    // *presence*, not truthiness, so gravitySystem/integrateSystem/
    // collisionSystem/ballCollisionSystem only skip an entity that
    // genuinely lacks the "dynamic" key. A platform archetype sets
    // `physics.dynamic: false` to get exactly that: it neither falls nor
    // bounces off stage bounds, and moves only via its own behavior
    // (e.g. the patrolKinematic preset, which mutates x/y directly).
    ...(dynamic ? { dynamic: true } : {}),
    x, y, vx, vy,
    radius, restitution, friction,
    scaleX: 1, scaleY: 1, scaleVelX: 0, scaleVelY: 0,
    el, circleEl,
    stats,
    // Present only on platform archetypes — packages/platformer's
    // platformCarrySystem is the one consumer, queried by this field's
    // presence rather than a category name.
    ...(platformSize ? { platformSize } : {}),
  });
  attachBehavior(entity, archetype.behavior);
  return entity;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export function serializeFromArchetype(entity) {
  return {
    x: round(entity.x),
    y: round(entity.y),
    vx: round(entity.vx ?? 0),
    vy: round(entity.vy ?? 0),
    stats: { ...entity.stats },
  };
}

// Archetype inheritance: an archetype can name a parent via `extends`, and
// resolveArchetype walks that chain and merges parent -> child before
// anything else ever sees the record. spawnFromArchetype/
// archetypeToDefinition never need to know inheritance exists — resolution
// always happens first, in the shared scene loader (sceneLoader.js).
//
// `byId(id)` is injected (a Map, or anything with a `.get`) rather than
// this module reaching into a specific catalog/store — resolveArchetype
// itself has zero I/O.
export function resolveArchetype(archetype, byId, visited = new Set()) {
  if (!archetype.extends) return archetype;
  if (visited.has(archetype.id)) {
    throw new Error(`Archetype inheritance cycle detected at "${archetype.id}"`);
  }
  visited.add(archetype.id);

  const parentRaw = byId.get(archetype.extends);
  if (!parentRaw) {
    throw new Error(`Archetype "${archetype.id}" extends unknown archetype "${archetype.extends}"`);
  }
  const parent = resolveArchetype(parentRaw, byId, visited);

  return {
    ...parent,
    ...archetype,
    physics: { ...parent.physics, ...archetype.physics },
    visual: { ...parent.visual, ...archetype.visual },
    // The child's own behavior wins wholesale when present — merging two
    // different behavior shapes field-by-field wouldn't make sense (e.g.
    // an inputMap vs. a scripted preset), so "more specific wins" is the
    // only reasonable rule.
    behavior: archetype.behavior ?? parent.behavior,
    // Properties concatenate, with a child's same-named entry overriding
    // the parent's rather than appearing twice.
    properties: mergeProperties(parent.properties, archetype.properties),
  };
}

function mergeProperties(parentProps = [], childProps = []) {
  const merged = [...parentProps];
  for (const childProp of childProps) {
    const i = merged.findIndex((p) => p.name === childProp.name);
    if (i === -1) merged.push(childProp);
    else merged[i] = childProp;
  }
  return merged;
}

// Wraps a fetched/authored archetype record into an ordinary catalog
// definition — the catalog/instantiate/scene machinery never knows this
// definition's spawn/serialize are generic rather than hand-written.
export function archetypeToDefinition(archetype) {
  return {
    id: archetype.id,
    category: archetype.category,
    label: archetype.label,
    swatch: archetype.swatch,
    coordinateSpace: "pixel",
    spawn: (world, worldEl, def) => spawnFromArchetype(world, worldEl, def, archetype),
    serialize: (entity) => serializeFromArchetype(entity),
    buildSpawnDef(x, y) {
      return { x, y, stats: statsFromProperties(archetype.properties) };
    },
  };
}
