import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clampPosition, clampSize, detectEdgeZone } from "../window-geometry.js";
import { windowManager, windowStorageKey } from "../window-manager.js";
import { TOP_INSET, EDGE_THRESHOLD } from "../layout-constants.js";

function loadRect(id, defaultPosition, defaultSize) {
  try {
    const raw = localStorage.getItem(windowStorageKey(id));
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to defaults
  }
  return { ...defaultPosition, ...defaultSize };
}

function persistRect(id, rect) {
  try {
    localStorage.setItem(windowStorageKey(id), JSON.stringify(rect));
  } catch {
    // best-effort; just won't survive reload
  }
}

// The one reusable "floating or docked tool panel" shell every editor
// panel renders inside — a title bar (drag handle + close button), an
// optional bottom-right resize grip, and a scrollable body.
//
// A window is either "float" (its own position/size, persisted per `id`
// via windowStorageKey, draggable/resizable freely) or docked to an edge
// ("left"/"right"/"bottom" — see window-manager.js's setDock/getDock and
// dock-layout.js), in which case `dockedRect` (computed by the parent,
// since it depends on every *other* window sharing that edge too) fully
// determines its rect and it's neither draggable-to-move nor resizable —
// only draggable back out to undock. The floating rect is still tracked
// and persisted while docked, so undocking has a sensible place to land.
export function Window({
  id,
  title,
  defaultPosition,
  defaultSize,
  minWidth = 180,
  minHeight = 100,
  resizable = true,
  dock = "float",
  dockedRect,
  onClose,
  children,
}) {
  const [rect, setRect] = useState(() => loadRect(id, defaultPosition, defaultSize));
  const dragRef = useRef(null); // { mode: "drag"|"resize", startX, startY, startRect, wasDocked }

  // Re-render on any windowManager change so a newly-raised z-index (or a
  // dock reassignment made elsewhere, e.g. via a future keyboard shortcut)
  // shows up immediately — visibility itself is the parent's concern (it
  // decides whether to mount this Window at all).
  useSyncExternalStore(windowManager.subscribe, windowManager.getSnapshot);

  useEffect(() => {
    // The viewport may have shrunk since this rect was saved (a smaller
    // window, a different monitor) — reclamp once on mount rather than
    // only during the next drag. Applies to the floating rect regardless
    // of current dock state, since that's what undocking will fall back to.
    setRect((r) => ({
      ...clampPosition(r.x, r.y, r.width, r.height, window.innerWidth, window.innerHeight, TOP_INSET),
      ...clampSize(r.width, r.height, minWidth, minHeight),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function beginDrag(e) {
    windowManager.bringToFront(id);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    dragRef.current = { mode: "drag", startX: e.clientX, startY: e.clientY, startRect: rect, wasDocked: dock !== "float" };
  }

  function beginResize(e) {
    windowManager.bringToFront(id);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    dragRef.current = { mode: "resize", startX: e.clientX, startY: e.clientY, startRect: rect };
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "resize") {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const { width, height } = clampSize(drag.startRect.width + dx, drag.startRect.height + dy, minWidth, minHeight);
      setRect((r) => ({ ...r, width, height }));
      return;
    }

    // Dragging the title bar: always track which edge (if any) the
    // pointer is near, for DockOverlay.jsx's highlight — a currently
    // docked window's own DOM rect doesn't move during the drag (it
    // stays in its computed slot); only a floating window visually
    // follows the cursor, exactly as before dock support existed.
    windowManager.setDockHover(detectEdgeZone(e.clientX, e.clientY, window.innerWidth, window.innerHeight, EDGE_THRESHOLD));

    if (!drag.wasDocked) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const { x, y } = clampPosition(
        drag.startRect.x + dx,
        drag.startRect.y + dy,
        drag.startRect.width,
        drag.startRect.height,
        window.innerWidth,
        window.innerHeight,
        TOP_INSET
      );
      setRect((r) => ({ ...r, x, y }));
    }
  }

  function endDrag(e) {
    const drag = dragRef.current;
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.userSelect = "";
    dragRef.current = null;

    if (drag.mode === "drag") {
      const hoverZone = windowManager.getDockHoverSnapshot();
      windowManager.setDockHover(null);
      if (hoverZone) {
        windowManager.setDock(id, hoverZone);
      } else if (drag.wasDocked) {
        // Dropped away from every edge while docked — undock, landing the
        // new floating rect centered under the drop point.
        const { x, y } = clampPosition(
          e.clientX - rect.width / 2,
          e.clientY - 20,
          rect.width,
          rect.height,
          window.innerWidth,
          window.innerHeight,
          TOP_INSET
        );
        setRect((r) => {
          const next = { ...r, x, y };
          persistRect(id, next);
          return next;
        });
        windowManager.setDock(id, "float");
        return;
      }
    }

    setRect((r) => {
      persistRect(id, r);
      return r;
    });
  }

  const isDocked = dock !== "float";
  const activeRect = isDocked && dockedRect ? dockedRect : rect;

  return (
    <div
      className={`window${isDocked ? " docked" : ""}`}
      style={{
        left: activeRect.x,
        top: activeRect.y,
        width: activeRect.width,
        height: activeRect.height,
        zIndex: windowManager.getZIndex(id),
      }}
      onPointerDown={() => windowManager.bringToFront(id)}
    >
      <div
        className="window-titlebar"
        onPointerDown={beginDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
      >
        <span className="window-titlebar-title">{title}</span>
        {onClose && (
          <button className="window-close-btn" onClick={onClose} title={`Close ${title}`} aria-label={`Close ${title}`}>
            &times;
          </button>
        )}
      </div>
      <div className="window-body">{children}</div>
      {resizable && !isDocked && (
        <div
          className="window-resize-handle"
          onPointerDown={beginResize}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
        />
      )}
    </div>
  );
}
