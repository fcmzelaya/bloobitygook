import { createWorld, query, destroy, clearChildren, startLoop } from "@bloobitygook/engine/core";
import {
  canPlace,
  checkCompleteRows,
  cellKey,
  absoluteCells,
  renderCellGroup,
  spawnBlock,
  moveBlockRow,
  rowAfterClear,
  occupiedAfterClear,
} from "@bloobitygook/grid";
import { createTrigger, runTriggers } from "@bloobitygook/triggers";
import { spawnPiece, cellsForRotation, randomPieceType } from "./pieces.js";

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 24;
const BOUNDS = { cols: COLS, rows: ROWS };
const SPAWN_ORIGIN = { col: 4, row: -1 };
const DROP_INTERVAL_MS = 700;
const LINE_SCORES = [0, 100, 300, 500, 800]; // classic-ish bonus for 1/2/3/4 lines at once

const worldEl = document.getElementById("world");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");

let world;
let occupied;
let current;
let score;
let gameOver;
let dropTimer;

function resetGame() {
  clearChildren(worldEl);
  world = createWorld();
  occupied = new Set();
  current = null;
  score = 0;
  gameOver = false;
  dropTimer = 0;
  scoreEl.textContent = "0";
  statusEl.textContent = "Arrow keys to play";
  statusEl.classList.remove("game-over");
  spawnNext();
}

function spawnNext() {
  const type = randomPieceType();
  current = spawnPiece(world, worldEl, type, SPAWN_ORIGIN, CELL_SIZE);
  if (!canPlace(occupied, absoluteCells(current), BOUNDS)) {
    endGame();
  }
}

function endGame() {
  gameOver = true;
  statusEl.textContent = `Game over — press any key to restart`;
  statusEl.classList.add("game-over");
}

// The trigger system's first real use case: "which rows are complete" is
// the condition, "clear them and shift everything above down" is the
// action. Reading `occupied`/`world` from the closure rather than
// passing them through the trigger's own `world` arg since Tetris keeps
// its board state (occupied cells) separately from the ECS world.
const lineClearTrigger = createTrigger({
  condition: () => checkCompleteRows(occupied, BOUNDS),
  action: (_world, rows) => clearRows(rows),
});

function lockPiece() {
  const color = current.color;
  for (const cell of absoluteCells(current)) {
    occupied.add(cellKey(cell.col, cell.row));
    spawnBlock(world, worldEl, { col: cell.col, row: cell.row, cellSize: CELL_SIZE, color });
  }
  destroy(world, current.id);
  current.el.remove();
  current = null;

  const fired = runTriggers(world, [lineClearTrigger]);
  const clearedCount = fired[0]?.matches.length ?? 0;
  score += LINE_SCORES[clearedCount] ?? 0;
  scoreEl.textContent = String(score);

  spawnNext();
}

function clearRows(rows) {
  const rowSet = new Set(rows);
  for (const block of query(world, ["entityType", "col", "row"])) {
    if (block.entityType !== "block") continue;
    if (rowSet.has(block.row)) {
      destroy(world, block.id);
      block.el.remove();
    } else {
      moveBlockRow(block, rowAfterClear(block.row, rows));
    }
  }
  // occupied is rebuilt wholesale from itself, purely, rather than
  // mutated cell-by-cell in step with the block loop above — see
  // occupiedAfterClear's doc comment for the ordering bug that pattern
  // had (regression-tested in packages/grid/test/collision.test.js).
  occupied = occupiedAfterClear(occupied, rows);
}

function moveHorizontal(dir) {
  if (gameOver || !current) return;
  const candidate = { ...current, col: current.col + dir };
  if (canPlace(occupied, absoluteCells(candidate), BOUNDS)) {
    current.col += dir;
    renderCellGroup(current);
  }
}

function rotate() {
  if (gameOver || !current) return;
  const nextRotation = (current.rotation + 1) % 4;
  const candidate = { ...current, cells: cellsForRotation(current.pieceType, nextRotation) };
  if (canPlace(occupied, absoluteCells(candidate), BOUNDS)) {
    current.rotation = nextRotation;
    current.cells = candidate.cells;
    renderCellGroup(current);
  }
}

function softDropTick() {
  if (gameOver || !current) return;
  const candidate = { ...current, row: current.row + 1 };
  if (canPlace(occupied, absoluteCells(candidate), BOUNDS)) {
    current.row += 1;
    renderCellGroup(current);
  } else {
    lockPiece();
  }
}

window.addEventListener("keydown", (e) => {
  if (gameOver) {
    if (e.key.startsWith("Arrow") || e.key === " ") resetGame();
    return;
  }
  switch (e.key) {
    case "ArrowLeft":
      moveHorizontal(-1);
      break;
    case "ArrowRight":
      moveHorizontal(1);
      break;
    case "ArrowDown":
      softDropTick();
      dropTimer = 0;
      break;
    case "ArrowUp":
      rotate();
      break;
    default:
      return;
  }
  e.preventDefault();
});

function update(dt) {
  if (gameOver) return;
  dropTimer += dt * 1000;
  if (dropTimer >= DROP_INTERVAL_MS) {
    dropTimer = 0;
    softDropTick();
  }
}

function render() {
  // Grid pieces render on mutation (see renderCellGroup calls above), not
  // every frame — nothing to do here. update()/render() still run through
  // the shared engine loop for the drop timer.
}

resetGame();
startLoop({ update, render });
