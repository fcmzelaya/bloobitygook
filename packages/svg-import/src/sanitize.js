import DOMPurify from "dompurify";

// SVG import is the one place this repo accepts untrusted markup from a
// file the user picked, so this leans on a proven, maintained sanitizer
// rather than hand-rolled regex stripping (a well-known way to get this
// wrong). The SVG profile already strips <script>, on* handlers, and
// javascript:/external hrefs; FORBID_TAGS/FORBID_ATTR close two gaps a
// bare profile leaves open: `style` can smuggle a CSS url() exfiltration,
// and `use`/`image` can reference an external resource indirectly.
const SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: false },
  ALLOWED_TAGS: ["svg", "path", "circle", "rect", "ellipse", "polygon", "polyline", "line", "g"],
  FORBID_TAGS: ["script", "foreignObject", "style", "image", "use"],
  FORBID_ATTR: ["style"],
  ALLOW_DATA_ATTR: false,
};

const SVG_OPEN_TAG = /^<svg[^>]*>/i;
const SVG_CLOSE_TAG = /<\/svg>\s*$/i;

// Callers should sanitize both at import time (before persisting an
// archetype) and again at spawn time (defense in depth — never trust a
// stored string as pre-clean, in case a record was hand-edited).
//
// Always deals in fragments (no <svg> wrapper), regardless of whether the
// input has one — a bare shape fragment like "<circle .../>" has to be
// wrapped before handing it to DOMPurify, since without <svg> context the
// HTML parser doesn't recognize SVG-only elements as foreign content and
// silently drops them; the wrapper is stripped back off the result so
// callers (the spawn path, an editor preview) always get a fragment back.
export function sanitizeSvg(rawSvgString) {
  const alreadyWrapped = /<svg[\s>]/i.test(rawSvgString);
  const wrapped = alreadyWrapped
    ? rawSvgString
    : `<svg xmlns="http://www.w3.org/2000/svg">${rawSvgString}</svg>`;
  const cleaned = DOMPurify.sanitize(wrapped, SANITIZE_CONFIG);
  return cleaned.replace(SVG_OPEN_TAG, "").replace(SVG_CLOSE_TAG, "");
}
