// Small hand-rolled store for the editor's floating/dockable windows —
// visibility (open/closed), dock assignment, and z-order — matching
// engine.js's existing subscribe/getSnapshot + action-function shape
// rather than pulling in a state-management dependency. Position/size for
// a *floating* window are owned by the Window instance itself
// (Window.jsx); a *docked* window's rect instead comes from
// dock-layout.js, driven by the assignment this module tracks.

// A name-keyed list (this codebase's registry convention) rather than a
// hardcoded count — a future window is one array entry, not a redesign.
// "toolbar" is deliberately not here: it's a permanent top bar now (see
// GameEditor.jsx), not part of the window/dock system at all. Order here
// is also the default z-order (later = on top) and the order
// WindowMenu.jsx lists them in.
export const WINDOW_IDS = ["game-metadata", "palette", "inspector", "scene-panel"];

export const DOCK_ZONES = ["float", "left", "right", "bottom"];

const VISIBILITY_KEY = "bloobitygook:editor:window-visibility";
const DOCK_KEY = "bloobitygook:editor:window-dock";
export function windowStorageKey(id) {
  return `bloobitygook:editor:window:${id}`;
}

// `storage` is injectable (defaults to window.localStorage) so this
// module's logic is unit-testable with a fake store — the same injection
// pattern packages/triggers/zone.js's entityFilter and
// apps/scene-player's fetchArchetype already use. Guarded for
// window/localStorage not existing at all (SSR/test contexts), mirroring
// packages/engine/src/fileio.js's hasFileSystemAccess guard.
function defaultStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function loadMap(storage, key, defaultValue) {
  const defaults = Object.fromEntries(WINDOW_IDS.map((id) => [id, defaultValue]));
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(key);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

// A fresh store per call (rather than one hidden module-level singleton)
// so tests can inject an isolated fake storage without leaking state
// between tests; the real app creates exactly one via the default export
// below.
export function createWindowManager(storage = defaultStorage()) {
  let visibility = loadMap(storage, VISIBILITY_KEY, true);
  let dock = loadMap(storage, DOCK_KEY, "float");
  const zIndexes = new Map();
  let topZ = 100;
  const listeners = new Set();
  // Cached and only ever replaced inside notify() below — getSnapshot()
  // must return the same reference across repeated calls whenever
  // nothing has actually changed, or useSyncExternalStore sees a "new"
  // value on every render and loops forever re-rendering. bringToFront
  // still needs to produce a new reference here (even though it doesn't
  // touch `visibility`/`dock`) so Window.jsx's subscription actually
  // re-renders when z-order changes.
  let snapshot = { visibility, dock };

  function notify() {
    snapshot = { visibility, dock };
    listeners.forEach((listener) => listener());
  }

  function persist(key, value) {
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      // storage full/unavailable — state just won't survive reload
    }
  }

  // A separate, un-persisted mini pub-sub for drag-hover — kept apart
  // from the visibility/dock store above deliberately: hover changes on
  // every pointermove during a drag, and only DockOverlay.jsx needs to
  // react to it. Folding it into the main snapshot would re-render every
  // window on every pixel of drag movement for no reason.
  let hoverZone = null;
  const hoverListeners = new Set();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    toggleWindow(id) {
      visibility = { ...visibility, [id]: !visibility[id] };
      persist(VISIBILITY_KEY, visibility);
      notify();
    },
    getDock(id) {
      return dock[id] ?? "float";
    },
    setDock(id, zone) {
      dock = { ...dock, [id]: zone };
      persist(DOCK_KEY, dock);
      notify();
    },
    bringToFront(id) {
      topZ += 1;
      zIndexes.set(id, topZ);
      notify();
    },
    getZIndex(id) {
      return zIndexes.get(id) ?? 100;
    },
    subscribeDockHover(listener) {
      hoverListeners.add(listener);
      return () => hoverListeners.delete(listener);
    },
    getDockHoverSnapshot() {
      return hoverZone;
    },
    setDockHover(zone) {
      if (zone === hoverZone) return; // avoid needless re-renders while the pointer sits still within the same zone
      hoverZone = zone;
      hoverListeners.forEach((listener) => listener());
    },
    // Clears every window's saved position/size plus visibility/dock,
    // then reloads — the simplest correct way to force every mounted
    // Window back to its default rect, instead of a cross-component
    // reset signal.
    resetLayout() {
      try {
        for (const id of WINDOW_IDS) storage?.removeItem(windowStorageKey(id));
        storage?.removeItem(VISIBILITY_KEY);
        storage?.removeItem(DOCK_KEY);
      } catch {
        // best-effort; reload still resets in-memory state either way
      }
      // Guarded the same way defaultStorage() is above — a no-op outside
      // a real browser (e.g. this module's own unit tests run in Node).
      if (typeof window !== "undefined") window.location.reload();
    },
  };
}

export const windowManager = createWindowManager();
