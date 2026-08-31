import { describe, it, expect, vi } from "vitest";
import { createWindowManager, WINDOW_IDS, windowStorageKey } from "../src/window-manager.js";

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
    _data: data,
  };
}

describe("createWindowManager", () => {
  it("getSnapshot returns the identical reference across repeated calls when nothing changed", () => {
    // useSyncExternalStore requires this — a fresh object on every call
    // (even with equal contents) makes React think the store changed on
    // every render and loop forever re-rendering.
    const manager = createWindowManager(fakeStorage());
    expect(manager.getSnapshot()).toBe(manager.getSnapshot());
  });

  it("getSnapshot returns a new reference only after an actual change", () => {
    const manager = createWindowManager(fakeStorage());
    const before = manager.getSnapshot();
    manager.toggleWindow("game-metadata");
    expect(manager.getSnapshot()).not.toBe(before);
  });

  it("defaults every window to visible when storage has nothing saved", () => {
    const manager = createWindowManager(fakeStorage());
    const { visibility } = manager.getSnapshot();
    for (const id of WINDOW_IDS) expect(visibility[id]).toBe(true);
  });

  it("loads previously-saved visibility from storage", () => {
    const storage = fakeStorage({
      "bloobitygook:editor:window-visibility": JSON.stringify({ inspector: false }),
    });
    const manager = createWindowManager(storage);
    const { visibility } = manager.getSnapshot();
    expect(visibility.inspector).toBe(false);
    expect(visibility.palette).toBe(true); // untouched ids still default true
  });

  it("falls back to defaults when the saved value is corrupt JSON", () => {
    const storage = fakeStorage({ "bloobitygook:editor:window-visibility": "{not json" });
    const manager = createWindowManager(storage);
    const { visibility } = manager.getSnapshot();
    expect(visibility.palette).toBe(true);
  });

  it("toggleWindow flips visibility, persists it, and notifies subscribers", () => {
    const storage = fakeStorage();
    const manager = createWindowManager(storage);
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.toggleWindow("palette");

    expect(manager.getSnapshot().visibility.palette).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    // The whole visibility map is persisted, not just the changed id.
    expect(JSON.parse(storage.getItem("bloobitygook:editor:window-visibility"))).toMatchObject({ palette: false });

    manager.toggleWindow("palette");
    expect(manager.getSnapshot().visibility.palette).toBe(true);
  });

  it("subscribe returns an unsubscribe function", () => {
    const manager = createWindowManager(fakeStorage());
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    unsubscribe();
    manager.toggleWindow("game-metadata");
    expect(listener).not.toHaveBeenCalled();
  });

  it("bringToFront raises a window's z-index above previously-raised ones", () => {
    const manager = createWindowManager(fakeStorage());
    const before = manager.getZIndex("game-metadata");
    manager.bringToFront("game-metadata");
    const afterFirst = manager.getZIndex("game-metadata");
    expect(afterFirst).toBeGreaterThan(before);

    manager.bringToFront("inspector");
    expect(manager.getZIndex("inspector")).toBeGreaterThan(afterFirst);
    expect(manager.getZIndex("game-metadata")).toBe(afterFirst); // unraised window stays put
  });

  it("getZIndex defaults to a base value for a window never brought to front", () => {
    const manager = createWindowManager(fakeStorage());
    expect(manager.getZIndex("scene-panel")).toBe(100);
  });

  it("resetLayout clears every window's position, visibility, and dock keys", () => {
    // This suite runs in vitest's "node" environment (see vitest.config.js
    // — no jsdom needed for pure logic), so `window` genuinely doesn't
    // exist here; resetLayout's reload call is guarded for exactly that
    // case, making it a safe no-op rather than something to mock out.
    const storage = fakeStorage({
      [windowStorageKey("game-metadata")]: JSON.stringify({ x: 1, y: 2, width: 3, height: 4 }),
      "bloobitygook:editor:window-visibility": JSON.stringify({ inspector: false }),
      "bloobitygook:editor:window-dock": JSON.stringify({ palette: "left" }),
    });
    const manager = createWindowManager(storage);

    manager.resetLayout();

    for (const id of WINDOW_IDS) expect(storage.getItem(windowStorageKey(id))).toBeNull();
    expect(storage.getItem("bloobitygook:editor:window-visibility")).toBeNull();
    expect(storage.getItem("bloobitygook:editor:window-dock")).toBeNull();
  });
});

describe("dock assignment", () => {
  it("defaults every window to float when storage has nothing saved", () => {
    const manager = createWindowManager(fakeStorage());
    for (const id of WINDOW_IDS) expect(manager.getDock(id)).toBe("float");
  });

  it("loads a previously-saved dock assignment from storage", () => {
    const storage = fakeStorage({ "bloobitygook:editor:window-dock": JSON.stringify({ palette: "left" }) });
    const manager = createWindowManager(storage);
    expect(manager.getDock("palette")).toBe("left");
    expect(manager.getDock("inspector")).toBe("float"); // untouched ids still default float
  });

  it("setDock updates, persists, and notifies subscribers", () => {
    const storage = fakeStorage();
    const manager = createWindowManager(storage);
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setDock("inspector", "right");

    expect(manager.getDock("inspector")).toBe("right");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.getItem("bloobitygook:editor:window-dock"))).toMatchObject({ inspector: "right" });
  });

  it("re-docking to a different zone (or back to float) overwrites the previous assignment", () => {
    const manager = createWindowManager(fakeStorage());
    manager.setDock("scene-panel", "bottom");
    expect(manager.getDock("scene-panel")).toBe("bottom");
    manager.setDock("scene-panel", "float");
    expect(manager.getDock("scene-panel")).toBe("float");
  });

  it("getSnapshot's dock reference only changes when a dock assignment actually changes", () => {
    const manager = createWindowManager(fakeStorage());
    const before = manager.getSnapshot();
    manager.setDock("palette", "left");
    expect(manager.getSnapshot()).not.toBe(before);
  });
});

describe("dock hover (ephemeral, unpersisted)", () => {
  it("defaults to no hovered zone", () => {
    const manager = createWindowManager(fakeStorage());
    expect(manager.getDockHoverSnapshot()).toBeNull();
  });

  it("setDockHover updates the snapshot and notifies its own subscribers", () => {
    const manager = createWindowManager(fakeStorage());
    const listener = vi.fn();
    manager.subscribeDockHover(listener);

    manager.setDockHover("left");

    expect(manager.getDockHoverSnapshot()).toBe("left");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify when set to the same zone it's already at", () => {
    const manager = createWindowManager(fakeStorage());
    const listener = vi.fn();
    manager.setDockHover("bottom");
    manager.subscribeDockHover(listener);
    manager.setDockHover("bottom");
    expect(listener).not.toHaveBeenCalled();
  });

  it("clearing hover (null) notifies once", () => {
    const manager = createWindowManager(fakeStorage());
    manager.setDockHover("right");
    const listener = vi.fn();
    manager.subscribeDockHover(listener);
    manager.setDockHover(null);
    expect(manager.getDockHoverSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not persist to storage or notify the main visibility/dock subscribers", () => {
    const storage = fakeStorage();
    const manager = createWindowManager(storage);
    const mainListener = vi.fn();
    manager.subscribe(mainListener);

    manager.setDockHover("left");

    expect(mainListener).not.toHaveBeenCalled();
    expect(Object.keys(storage._data)).toEqual([]);
  });
});
