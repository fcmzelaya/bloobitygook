import { createWorld, spawn, destroy, query, createSvgElement, setAttrs, clearChildren, startLoop } from "@bloobitygook/engine";
import { createAnimation, animationSystem } from "@bloobitygook/animation";
import { createTrigger, runTriggers, createZone, zoneEntryCondition } from "@bloobitygook/triggers";
import { createBehavior, behaviorSystem } from "@bloobitygook/behavior";
import { MAZE_ROWS, COLS, ROWS, TUNNEL_ROW, isWallAt, cellKindAt } from "./maze.js";
import { tryMove, currentCell } from "./movement.js";
import { chooseDirection } from "./ghostAI.js";

const CELL_SIZE = 32;
const PLAYER_SPEED = 100; // px/sec
const GHOST_SPEED = 85;
const FRIGHTENED_DURATION = 6; // seconds
const PLAYER_SPAWN = { col: 5, row: 4 };
const GHOST_SPAWNS = [{ col: 5, row: 3 }, { col: 5, row: 5 }];
const GHOST_COLORS = ["#ec7063", "#5dade2"];
const HOME_CORNERS = [{ col: 0, row: 0 }, { col: COLS - 1, row: 0 }];
const FRIGHTENED_COLOR = "#3a4de0";

const worldEl = document.getElementById("world");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");

let world;
let player;
let ghosts;
let frightenedTimer;
let score;
let gameOver;
let won;

function cellToPixel(col, row) {
  return { x: col * CELL_SIZE, y: row * CELL_SIZE };
}

function isBlocked(col, row) {
  return isWallAt(col, row);
}

function resetGame() {
  clearChildren(worldEl);
  world = createWorld();
  score = 0;
  gameOver = false;
  won = false;
  frightenedTimer = 0;
  scoreEl.textContent = "0";
  statusEl.textContent = "Arrow keys to move";
  statusEl.classList.remove("game-over");

  drawWalls();
  spawnPellets();
  spawnPlayer();
  spawnGhosts();
}

function drawWalls() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (MAZE_ROWS[row][col] !== "#") continue;
      const { x, y } = cellToPixel(col, row);
      const el = createSvgElement("rect", {
        x: x - CELL_SIZE / 2,
        y: y - CELL_SIZE / 2,
        width: CELL_SIZE,
        height: CELL_SIZE,
        fill: "#1e2d4d",
      });
      worldEl.appendChild(el);
    }
  }
}

function spawnPellets() {
  const skip = new Set([
    `${PLAYER_SPAWN.col},${PLAYER_SPAWN.row}`,
    ...GHOST_SPAWNS.map((g) => `${g.col},${g.row}`),
  ]);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = cellKindAt(col, row, skip);
      if (!kind) continue;
      const { x, y } = cellToPixel(col, row);
      const radius = kind === "power" ? 6 : 2.5;
      const el = createSvgElement("circle", { cx: x, cy: y, r: radius, fill: "#f4d9a0" });
      worldEl.appendChild(el);
      spawn(world, { entityType: "pellet", kind, col, row, el });
    }
  }
}

function spawnPlayer() {
  const { x, y } = cellToPixel(PLAYER_SPAWN.col, PLAYER_SPAWN.row);
  const el = createSvgElement("circle", { cx: x, cy: y, r: CELL_SIZE / 2 - 3, fill: "#f4d54a" });
  worldEl.appendChild(el);
  player = spawn(world, {
    entityType: "player",
    x,
    y,
    direction: null,
    queuedDirection: null,
    speed: PLAYER_SPEED,
    el,
    // Simple size-pulse "chomp" — swapping attributes over time, the
    // same mechanism packages/animation is built around, not a literal
    // mouth shape (that would need path-arc math this demo doesn't need).
    animation: createAnimation([{ r: CELL_SIZE / 2 - 3 }, { r: CELL_SIZE / 2 - 8 }], 4),
  });
}

function spawnGhosts() {
  ghosts = GHOST_SPAWNS.map((spawnCell, i) => {
    const { x, y } = cellToPixel(spawnCell.col, spawnCell.row);
    const el = createSvgElement("circle", { cx: x, cy: y, r: CELL_SIZE / 2 - 3, fill: GHOST_COLORS[i] });
    worldEl.appendChild(el);
    return spawn(world, {
      entityType: "ghost",
      x,
      y,
      direction: null,
      queuedDirection: null,
      speed: GHOST_SPEED,
      el,
      color: GHOST_COLORS[i],
      home: HOME_CORNERS[i],
      spawnCell,
      behavior: createBehavior(
        {
          // "chase" and "scatter" are the same idea (seek a target) with
          // different targets — classic Pac-Man reuses one algorithm for
          // both, so this demo does too; only chase/flee are wired up
          // here (scattering isn't triggered by anything yet).
          chase: {
            update: (ghost) => updateGhostDirection(ghost, playerCell(), "closest"),
            next: () => (frightenedTimer > 0 ? "flee" : null),
          },
          flee: {
            update: (ghost) => updateGhostDirection(ghost, playerCell(), "farthest"),
            next: () => (frightenedTimer <= 0 ? "chase" : null),
          },
        },
        "chase"
      ),
    });
  });
}

function playerCell() {
  return currentCell(player, CELL_SIZE);
}

function updateGhostDirection(ghost, target, preference) {
  const { col, row } = currentCell(ghost, CELL_SIZE);
  ghost.queuedDirection = chooseDirection(col, row, ghost.direction, target, isBlocked, preference);
}

const KEY_DIRECTIONS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
window.addEventListener("keydown", (e) => {
  if (gameOver || won) {
    if (e.key.startsWith("Arrow")) resetGame();
    return;
  }
  const dir = KEY_DIRECTIONS[e.key];
  if (!dir) return;
  player.queuedDirection = dir;
  e.preventDefault();
});

// Portals: the tunnel row is the only place isBlocked() allows an entity
// to wander outside [0, COLS) — these zones catch it once it's gone far
// enough past the edge and wrap it to the opposite side. Second real use
// of packages/triggers (after Tetris's line-clear), and a genuinely
// different shape (spatial zone entry, not a board-state condition) —
// good evidence the abstraction covers more than one case.
const tunnelY = TUNNEL_ROW * CELL_SIZE;
const leftPortal = createZone(-CELL_SIZE * 1.5, tunnelY - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
const rightPortal = createZone(COLS * CELL_SIZE + CELL_SIZE * 0.5, tunnelY - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);

function movingEntities(w) {
  return query(w, ["entityType", "x", "y"]).filter((e) => e.entityType === "player" || e.entityType === "ghost");
}

const portalTriggers = [
  createTrigger({
    condition: zoneEntryCondition(leftPortal, movingEntities),
    action: (_world, matches) => matches.forEach((e) => (e.x = (COLS - 1) * CELL_SIZE)),
  }),
  createTrigger({
    condition: zoneEntryCondition(rightPortal, movingEntities),
    action: (_world, matches) => matches.forEach((e) => (e.x = 0)),
  }),
];

function handleEating() {
  const pCell = playerCell();

  for (const pellet of query(world, ["entityType", "col", "row"])) {
    if (pellet.entityType !== "pellet") continue;
    if (pellet.col !== pCell.col || pellet.row !== pCell.row) continue;
    score += pellet.kind === "power" ? 50 : 10;
    if (pellet.kind === "power") frightenedTimer = FRIGHTENED_DURATION;
    destroy(world, pellet.id);
    pellet.el.remove();
  }
  scoreEl.textContent = String(score);

  if (!gameOver && !won) {
    const remaining = query(world, ["entityType"]).filter((e) => e.entityType === "pellet");
    if (remaining.length === 0) {
      won = true;
      statusEl.textContent = `You win! Score ${score} — press any key to restart`;
    }
  }

  for (const ghost of ghosts) {
    const gCell = currentCell(ghost, CELL_SIZE);
    if (gCell.col !== pCell.col || gCell.row !== pCell.row) continue;
    if (frightenedTimer > 0) {
      score += 200;
      scoreEl.textContent = String(score);
      const { x, y } = cellToPixel(ghost.spawnCell.col, ghost.spawnCell.row);
      ghost.x = x;
      ghost.y = y;
      ghost.direction = null;
      ghost.queuedDirection = null;
    } else if (!gameOver) {
      gameOver = true;
      statusEl.textContent = `Game over — score ${score} — press any key to restart`;
      statusEl.classList.add("game-over");
    }
  }
}

function update(dt) {
  if (gameOver || won) return;

  if (frightenedTimer > 0) frightenedTimer = Math.max(0, frightenedTimer - dt);

  tryMove(player, dt, isBlocked, CELL_SIZE);
  behaviorSystem(world, dt); // sets each ghost's queuedDirection via its chase/flee state
  for (const ghost of ghosts) {
    tryMove(ghost, dt, isBlocked, CELL_SIZE);
    setAttrs(ghost.el, { fill: frightenedTimer > 0 ? FRIGHTENED_COLOR : ghost.color });
  }

  runTriggers(world, portalTriggers);
  animationSystem(world, dt);
  handleEating();
}

function render() {
  for (const e of query(world, ["entityType", "x", "y", "el"])) {
    if (e.entityType === "player" || e.entityType === "ghost") {
      setAttrs(e.el, { cx: e.x, cy: e.y });
    }
  }
}

resetGame();
startLoop({ update, render });
