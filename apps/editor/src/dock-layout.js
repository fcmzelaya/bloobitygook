import { TOP_INSET, DOCK_WIDTH, DOCK_HEIGHT } from "./layout-constants.js";

// Pure layout math for docked windows, split out so it's unit-testable
// without a browser — mirrors ui-helpers.js's existing split between pure
// logic and DOM-wiring. Floating windows manage their own rect (see
// Window.jsx) and never appear in this function's output at all.
//
// `dockAssignments` is { [windowId]: "float"|"left"|"right"|"bottom" }.
// Returns { [windowId]: {x,y,width,height} } for every non-"float" id.
export function computeDockLayout(dockAssignments, viewportWidth, viewportHeight) {
  const byZone = { left: [], right: [], bottom: [] };
  for (const [id, zone] of Object.entries(dockAssignments)) {
    if (byZone[zone]) byZone[zone].push(id);
  }

  const rects = {};

  const columnHeight = Math.max(viewportHeight - TOP_INSET, 0);
  byZone.left.forEach((id, i) => {
    rects[id] = { x: 0, y: TOP_INSET + (columnHeight / byZone.left.length) * i, width: DOCK_WIDTH, height: columnHeight / byZone.left.length };
  });
  byZone.right.forEach((id, i) => {
    rects[id] = {
      x: viewportWidth - DOCK_WIDTH,
      y: TOP_INSET + (columnHeight / byZone.right.length) * i,
      width: DOCK_WIDTH,
      height: columnHeight / byZone.right.length,
    };
  });

  // Spans the gap between the two side columns regardless of whether
  // they're currently occupied — simpler than interdependent reflow, and
  // avoids layout jank as windows dock/undock from the sides.
  const rowWidth = Math.max(viewportWidth - DOCK_WIDTH * 2, 0);
  byZone.bottom.forEach((id, i) => {
    rects[id] = {
      x: DOCK_WIDTH + (rowWidth / byZone.bottom.length) * i,
      y: viewportHeight - DOCK_HEIGHT,
      width: rowWidth / byZone.bottom.length,
      height: DOCK_HEIGHT,
    };
  });

  return rects;
}
