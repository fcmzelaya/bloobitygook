import { createWorld, query, destroy, clearChildren, createSvgElement, startLoop } from "@bloobitygook/engine/core";
import {
  canPlace,
  attemptTransform,
  checkCompleteRows,
  cellKey,
  absoluteCells,
  spawnBlock,
  moveBlockRow,
  rowAfterClear,
  occupiedAfterClear,
  createSpawner,
  applyGridGravity,
} from "@bloobitygook/grid";
import { createTieredGoalTrigger, runTriggers } from "@bloobitygook/triggers";
import { runStage, createActionDispatcher } from "@bloobitygook/stage";
import { PIECE_COLORS, PIECE_TYPES, cellsForRotation, spawnPiece } from "@bloobitygook/tetris-pieces";

// This is "the Tetris stage assembly" — every rule it applies (collision,
// spawning, gravity, tiered goal detection, transform-attempt-and-reject)
// is a generic capability from @bloobitygook/grid/triggers/stage. Nothing
// below is owned game-rule logic; it's board size, piece set, drop
// direction, and scoring, wired together into one running instance.
const BOUNDS = { cols: 10, rows: 20 };
const CELL_SIZE = 24;
const SPAWN_ORIGIN = { col: 4, row: -1 };
const DROP_DIRECTION = { dcol: 0, drow: 1 }; // "gravity" for this stage — a different stage could configure any direction
const TIER_SCORES = { single: 100, double: 300, triple: 500, tetris: 800 };
const BASE_DROP_INTERVAL_MS = 700;
const LINES_PER_LEVEL = 10;
const DROP_INTERVAL_DECAY_FACTOR = 0.85; // each level, the drop interval shrinks by this factor
const MIN_DROP_INTERVAL_MS = 100; // floor, so speed-up can't reach 0/negative
const NEXT_PREVIEW_CELL_SIZE = 20;

const worldEl = document.getElementById("world");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const nextPieceEl = document.getElementById("next-piece");

let world;
let occupied;
let current;
let score;
let level;
let totalLinesCleared;
let gameOver;
let dropTimer;
let dropIntervalMs;
let spawner;
let lineClearTrigger;
let stage;
let dispatch;

function currentDropInterval() {
  return Math.max(
    MIN_DROP_INTERVAL_MS,
    Math.round(BASE_DROP_INTERVAL_MS * Math.pow(DROP_INTERVAL_DECAY_FACTOR, level - 1))
  );
}

// Shows the spawner's lookahead — what spawner.next() will return the
// *following* time spawnNext() runs, i.e. the piece after the one
// currently falling.
function renderNextPiece() {
  clearChildren(nextPieceEl);
  const type = spawner.peek();
  for (const cell of cellsForRotation(type, 0)) {
    const rect = createSvgElement("rect", {
      width: NEXT_PREVIEW_CELL_SIZE - 2,
      height: NEXT_PREVIEW_CELL_SIZE - 2,
      x: (cell.col + 2) * NEXT_PREVIEW_CELL_SIZE + 1,
      y: (cell.row + 2) * NEXT_PREVIEW_CELL_SIZE + 1,
      fill: PIECE_COLORS[type],
      rx: 3,
    });
    nextPieceEl.appendChild(rect);
  }
}

function resetGame() {
  clearChildren(worldEl);
  world = createWorld();
  occupied = new Set();
  current = null;
  score = 0;
  level = 1;
  totalLinesCleared = 0;
  gameOver = false;
  dropTimer = 0;
  dropIntervalMs = currentDropInterval();
  spawner = createSpawner({ candidates: PIECE_TYPES });

  lineClearTrigger = createTieredGoalTrigger({
    condition: () => checkCompleteRows(occupied, BOUNDS),
    tierNames: ["single", "double", "triple", "tetris"],
    onAchieve: (_world, rows, tier) => clearRows(rows, tier),
  });

  stage = {
    systems: [{ fn: dropSystem, config: null }],
    controls: {
      moveLeft: () => attemptMove(-1),
      moveRight: () => attemptMove(1),
      rotate: () => attemptRotate(),
      softDrop: () => softDropTick(),
      hardDrop: () => hardDrop(),
    },
  };
  dispatch = createActionDispatcher(stage);

  scoreEl.textContent = "0";
  levelEl.textContent = "Level 1";
  statusEl.textContent = "Arrow keys to play";
  statusEl.classList.remove("game-over");
  spawnNext();
}

function spawnNext() {
  const type = spawner.next();
  current = spawnPiece(world, worldEl, type, SPAWN_ORIGIN, CELL_SIZE);
  if (!canPlace(occupied, absoluteCells(current), BOUNDS)) {
    endGame();
  }
  renderNextPiece();
}

function endGame() {
  gameOver = true;
  statusEl.textContent = "Game over — press any key to restart";
  statusEl.classList.add("game-over");
}

function lockPiece() {
  const color = current.color;
  for (const cell of absoluteCells(current)) {
    occupied.add(cellKey(cell.col, cell.row));
    spawnBlock(world, worldEl, { col: cell.col, row: cell.row, cellSize: CELL_SIZE, color });
  }
  destroy(world, current.id);
  current.el.remove();
  current = null;

  runTriggers(world, [lineClearTrigger]);

  spawnNext();
}

function clearRows(rows, tier) {
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

  totalLinesCleared += rows.length;
  level = 1 + Math.floor(totalLinesCleared / LINES_PER_LEVEL);
  dropIntervalMs = currentDropInterval();
  score += TIER_SCORES[tier] * level;

  scoreEl.textContent = String(score);
  levelEl.textContent = `Level ${level}`;
}

function attemptMove(dir) {
  if (gameOver || !current) return;
  attemptTransform(current, { col: current.col + dir }, occupied, BOUNDS);
}

function attemptRotate() {
  if (gameOver || !current) return;
  const nextRotation = (current.rotation + 1) % 4;
  attemptTransform(
    current,
    { rotation: nextRotation, cells: cellsForRotation(current.pieceType, nextRotation) },
    occupied,
    BOUNDS
  );
}

function softDropTick() {
  if (gameOver || !current) return;
  if (!applyGridGravity(current, DROP_DIRECTION, occupied, BOUNDS)) {
    lockPiece();
  }
}

function hardDrop() {
  if (gameOver || !current) return;
  // eslint-disable-next-line no-empty -- drop until blocked, no per-step work needed
  while (applyGridGravity(current, DROP_DIRECTION, occupied, BOUNDS)) {}
  lockPiece();
}

// The per-tick system driving the timed fall — registered on the stage's
// systems list like any other per-tick system would be.
function dropSystem(_world, dt) {
  if (gameOver || !current) return;
  dropTimer += dt * 1000;
  if (dropTimer >= dropIntervalMs) {
    dropTimer = 0;
    softDropTick();
  }
}

window.addEventListener("keydown", (e) => {
  if (gameOver) {
    if (e.key.startsWith("Arrow") || e.key === " ") resetGame();
    return;
  }
  switch (e.key) {
    case "ArrowLeft":
      dispatch("moveLeft");
      break;
    case "ArrowRight":
      dispatch("moveRight");
      break;
    case "ArrowDown":
      dispatch("softDrop");
      dropTimer = 0;
      break;
    case "ArrowUp":
      dispatch("rotate");
      break;
    case " ":
      dispatch("hardDrop");
      break;
    default:
      return;
  }
  e.preventDefault();
});

function update(dt) {
  if (gameOver) return;
  runStage(stage, world, dt);
}

function render() {
  // Grid pieces render on mutation (see attemptTransform/applyGridGravity
  // above), not every frame — nothing to do here. update()/render() still
  // run through the shared engine loop for the drop timer.
}

resetGame();
startLoop({ update, render });
