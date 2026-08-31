// Shared sizing between Window.jsx, dock-layout.js, and GameEditor.jsx's
// default rects — kept in one place so the dock math and the clamp math
// agree on where the permanent chrome (header + toolbar) ends.

// Header (44px, see index.html's #app-header) + the permanent toolbar's
// assumed height (~44px, see index.html's #toolbar). Treated as fixed for
// v1 — the toolbar is meant to stay compact/single-row, so this isn't
// dynamically measured via ResizeObserver.
export const TOP_INSET = 96;

export const DOCK_WIDTH = 320; // left/right dock column width
export const DOCK_HEIGHT = 220; // bottom dock row height

// How close (px) the pointer must be to a screen edge while dragging a
// window's title bar for that edge's dock zone to highlight.
export const EDGE_THRESHOLD = 40;
