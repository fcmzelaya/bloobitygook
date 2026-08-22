import { spawn, createSvgElement } from "@bloobitygook/engine/core";

// A settled, static grid cell — what a falling cellGroup decomposes into
// on landing. Individually queryable/removable, which is what line-
// clearing needs (a cellGroup is one entity; the board needs N).
export function spawnBlock(world, worldEl, { col, row, cellSize, color }) {
  const el = createSvgElement("rect", {
    width: cellSize - 2,
    height: cellSize - 2,
    x: col * cellSize + 1,
    y: row * cellSize + 1,
    fill: color,
    rx: 3,
  });
  worldEl.appendChild(el);
  return spawn(world, { entityType: "block", col, row, cellSize, color, el });
}

// Used when a row clears and everything above shifts down to fill the gap.
export function moveBlockRow(entity, newRow) {
  entity.row = newRow;
  entity.el.setAttribute("y", newRow * entity.cellSize + 1);
}
