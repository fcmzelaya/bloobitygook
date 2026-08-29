// Pure — generates a complete, working Tetris instance, parameterized by
// board/piece/speed/level config, all defaulting to exactly what
// apps/tetris itself uses so leaving every field at its default
// reproduces that game. Every piece of actual game logic this imports
// (@bloobitygook/grid's collision/spawner/gravity, @bloobitygook/triggers'
// tiered goal detection, @bloobitygook/stage's orchestration) is generic
// and reusable — nothing generated here is Tetris-owned logic beyond the
// piece-shape data in @bloobitygook/tetris-pieces, mirroring
// apps/tetris/src/main.js's assembly shape exactly (see the comment there
// for why this isn't shared via a runtime function call: the wizard
// already bakes app-identity values like port/id as literal generated
// code, e.g. into vite.config.js). Board/scoring/pacing values themselves
// are NOT baked into generated source, unlike port/id/route — they're
// game tuning, not app identity, so they land in a generated config.json
// the new app's main.js imports, hand-editable after scaffolding without
// touching its logic (matching apps/tetris/src/config.json's own shape).
export function generateTetrisTemplateFiles({
  id,
  title,
  port,
  cols = 10,
  rows = 20,
  cellSize = 24,
  pieceSet = ["o", "j", "l", "i", "t", "z", "s"],
  dropIntervalMs = 700,
  linesPerLevel = 10,
  dropIntervalDecayFactor = 0.85,
}) {
  const base = `apps/${id}`;
  const boardWidth = cols * cellSize;
  const boardHeight = rows * cellSize;
  const spawnCol = Math.floor(cols / 2) - 1;
  const nextPreviewSize = 100;
  const nextPreviewCellSize = 20;

  return {
    [`${base}/package.json`]:
      JSON.stringify(
        {
          name: `@bloobitygook/${id}`,
          private: true,
          version: "0.1.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
            test: "vitest run",
          },
          dependencies: {
            "@bloobitygook/engine": "workspace:*",
            "@bloobitygook/grid": "workspace:*",
            "@bloobitygook/triggers": "workspace:*",
            "@bloobitygook/stage": "workspace:*",
            "@bloobitygook/tetris-pieces": "workspace:*",
          },
          devDependencies: {
            vite: "^6.0.0",
            vitest: "^3.0.0",
          },
          // Declares this app's own route in the composed public site
          // (scripts/compose-site.mjs discovers it from here — no central
          // list to edit for a new game app).
          bloobitygook: { route: id },
        },
        null,
        2
      ) + "\n",

    [`${base}/vite.config.js`]: `import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  optimizeDeps: {
    exclude: [
      "@bloobitygook/engine",
      "@bloobitygook/grid",
      "@bloobitygook/triggers",
      "@bloobitygook/stage",
      "@bloobitygook/tetris-pieces",
    ],
  },
  server: { port: ${port}, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  // Only prefixed for production builds — the composed public site serves
  // this app at /${id}/, but dev should stay at the server root.
  base: command === "build" ? "/${id}/" : "/",
}));
`,

    [`${base}/index.html`]: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>bloobitygook — ${title}</title>
  <style>
    html, body {
      margin: 0;
      height: 100%;
      background: #10131a;
      overflow: hidden;
      font-family: system-ui, sans-serif;
      color: #dfe4ee;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #layout {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    #stage {
      display: block;
      border: 1px solid #3a4152;
      border-radius: 4px;
    }
    #panel {
      width: 160px;
      font-size: 13px;
    }
    #panel h1 {
      font-size: 16px;
      margin: 0 0 12px;
    }
    #score {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    #level {
      color: #8b93a7;
      margin-bottom: 12px;
    }
    #next-label {
      color: #6b7284;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    #next-piece-stage {
      display: block;
      border: 1px solid #3a4152;
      border-radius: 4px;
      background: #1a1f2b;
      margin-bottom: 16px;
    }
    #status {
      color: #8b93a7;
      line-height: 1.5;
    }
    #status.game-over {
      color: #e0a0a0;
      font-weight: 600;
    }
    #controls {
      margin-top: 16px;
      color: #6b7284;
      font-size: 11px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div id="layout">
    <svg id="stage" viewBox="0 0 ${boardWidth} ${boardHeight}" width="${boardWidth}" height="${boardHeight}">
      <rect x="0" y="0" width="${boardWidth}" height="${boardHeight}" fill="#1a1f2b" />
      <g id="world"></g>
    </svg>
    <div id="panel">
      <h1>${title}</h1>
      <div id="score">0</div>
      <div id="level">Level 1</div>
      <div id="next-label">Next</div>
      <svg id="next-piece-stage" viewBox="0 0 ${nextPreviewSize} ${nextPreviewSize}" width="${nextPreviewSize}" height="${nextPreviewSize}">
        <g id="next-piece"></g>
      </svg>
      <div id="status">Arrow keys to play</div>
      <div id="controls">
        &larr;/&rarr; move<br />
        &darr; soft drop<br />
        &uarr; rotate<br />
        space hard drop
      </div>
    </div>
  </div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
`,

    [`${base}/src/config.json`]:
      JSON.stringify(
        {
          bounds: { cols, rows },
          cellSize,
          spawnOrigin: { col: spawnCol, row: -1 },
          dropDirection: { dcol: 0, drow: 1 },
          pieceSet,
          tierScores: { single: 100, double: 300, triple: 500, tetris: 800 },
          baseDropIntervalMs: dropIntervalMs,
          linesPerLevel,
          dropIntervalDecayFactor,
          minDropIntervalMs: 100,
          nextPreviewCellSize,
        },
        null,
        2
      ) + "\n",

    [`${base}/src/main.js`]: `import { createWorld, query, destroy, clearChildren, createSvgElement, startLoop } from "@bloobitygook/engine/core";
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
import { PIECE_COLORS, cellsForRotation, spawnPiece } from "@bloobitygook/tetris-pieces";
import config from "./config.json";

// Board/scoring/pacing values live in config.json, not as constants here
// — hand-editable after scaffolding without touching this file's logic.
const BOUNDS = config.bounds;
const CELL_SIZE = config.cellSize;
const SPAWN_ORIGIN = config.spawnOrigin;
const DROP_DIRECTION = config.dropDirection;
const PIECE_SET = config.pieceSet;
const TIER_SCORES = config.tierScores;
const BASE_DROP_INTERVAL_MS = config.baseDropIntervalMs;
const LINES_PER_LEVEL = config.linesPerLevel;
const DROP_INTERVAL_DECAY_FACTOR = config.dropIntervalDecayFactor;
const MIN_DROP_INTERVAL_MS = config.minDropIntervalMs;
const NEXT_PREVIEW_CELL_SIZE = config.nextPreviewCellSize;

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
  spawner = createSpawner({ candidates: PIECE_SET });

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
  occupied = occupiedAfterClear(occupied, rows);

  totalLinesCleared += rows.length;
  level = 1 + Math.floor(totalLinesCleared / LINES_PER_LEVEL);
  dropIntervalMs = currentDropInterval();
  score += TIER_SCORES[tier] * level;

  scoreEl.textContent = String(score);
  levelEl.textContent = \`Level \${level}\`;
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
  while (applyGridGravity(current, DROP_DIRECTION, occupied, BOUNDS)) {}
  lockPiece();
}

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

function render() {}

resetGame();
startLoop({ update, render });
`,
  };
}
