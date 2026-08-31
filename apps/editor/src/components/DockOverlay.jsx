import { useSyncExternalStore } from "react";
import { windowManager } from "../window-manager.js";
import { TOP_INSET, DOCK_WIDTH, DOCK_HEIGHT } from "../layout-constants.js";

// The visual feedback that makes drag-to-dock discoverable: while a
// window's title bar is being dragged near a screen edge (see
// Window.jsx's handlePointerMove -> windowManager.setDockHover), a
// translucent band highlights the zone it'll snap into on drop. Renders
// at most one band at a time; nothing while no drag is near an edge.
// Subscribes to the hover-only store, not the main visibility/dock
// snapshot, so this is the only component re-rendering on every pixel of
// drag movement.
export function DockOverlay() {
  const zone = useSyncExternalStore(windowManager.subscribeDockHover, windowManager.getDockHoverSnapshot);
  if (!zone) return null;

  const style =
    zone === "left"
      ? { left: 0, top: TOP_INSET, width: DOCK_WIDTH, bottom: 0 }
      : zone === "right"
        ? { right: 0, top: TOP_INSET, width: DOCK_WIDTH, bottom: 0 }
        : { left: DOCK_WIDTH, right: DOCK_WIDTH, bottom: 0, height: DOCK_HEIGHT };

  return <div id="dock-overlay-zone" style={style} />;
}
