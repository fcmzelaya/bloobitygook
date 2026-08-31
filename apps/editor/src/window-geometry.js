// Pure position/size math for Window.jsx, split out so it's unit-testable
// without a browser — mirrors ui-helpers.js's existing split between pure
// logic and DOM-wiring.

// Keeps at least MIN_VISIBLE px of the window within the viewport on every
// edge, so a window can never be dragged somewhere its title bar can't be
// dragged back from.
const MIN_VISIBLE = 40;

// `topInset` keeps a window's title bar from being dragged up underneath
// the app's fixed header (a window's z-index is deliberately higher than
// the header's, so without this a window could be dragged to cover it).
export function clampPosition(x, y, width, height, viewportWidth, viewportHeight, topInset = 0) {
  const minX = MIN_VISIBLE - width;
  const maxX = viewportWidth - MIN_VISIBLE;
  const minY = topInset;
  const maxY = viewportHeight - MIN_VISIBLE;
  return {
    x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
  };
}

export function clampSize(width, height, minWidth, minHeight) {
  return {
    width: Math.max(width, minWidth),
    height: Math.max(height, minHeight),
  };
}

// Which dock zone (if any) a point is within `threshold` px of, while
// dragging a window's title bar — checked left/right before bottom, so a
// drag near a bottom corner prefers docking to that side over the bottom
// row. Returns null when not near any edge (stays/becomes floating).
export function detectEdgeZone(x, y, viewportWidth, viewportHeight, threshold) {
  if (x <= threshold) return "left";
  if (x >= viewportWidth - threshold) return "right";
  if (y >= viewportHeight - threshold) return "bottom";
  return null;
}
