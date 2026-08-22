import { spawn, createSvgElement } from "@bloobitygook/engine/core";

// A "cell group" is a single entity representing several grid cells that
// move/rotate together — a falling Tetris piece, e.g. Rendered as one <g>
// (positioned at the group's col/row origin) containing one <rect> per
// cell (positioned by its offset within the group). Cell *count* stays
// fixed across rotations for a given piece; only the offsets change, so
// rotating never needs to add/remove DOM nodes — see renderCellGroup.
export function spawnCellGroup(world, worldEl, { col, row, cells, cellSize, color }) {
  const el = createSvgElement("g");
  const cellEls = cells.map(() => {
    const rect = createSvgElement("rect", {
      width: cellSize - 2,
      height: cellSize - 2,
      fill: color,
      rx: 3,
    });
    el.appendChild(rect);
    return rect;
  });
  worldEl.appendChild(el);

  const entity = spawn(world, {
    entityType: "cellGroup",
    col,
    row,
    cells,
    cellSize,
    color,
    el,
    cellEls,
  });
  renderCellGroup(entity);
  return entity;
}

// Call after mutating col/row/cells (move, rotate) — grid pieces don't
// need a continuous per-frame render pass like the physics entities do.
export function renderCellGroup(entity) {
  entity.el.setAttribute(
    "transform",
    `translate(${entity.col * entity.cellSize} ${entity.row * entity.cellSize})`
  );
  entity.cells.forEach((cell, i) => {
    const rect = entity.cellEls[i];
    rect.setAttribute("x", cell.col * entity.cellSize + 1);
    rect.setAttribute("y", cell.row * entity.cellSize + 1);
  });
}

// Absolute board cells this group currently occupies. Accepts any object
// with {col, row, cells} shape, not just a real entity — callers test
// hypothetical moves via a shallow-spread candidate before committing.
export function absoluteCells({ col, row, cells }) {
  return cells.map((c) => ({ col: col + c.col, row: row + c.row }));
}
