import { createWorld } from "./engine/world.js";
import { startLoop } from "./engine/loop.js";
import { gravitySystem, integrateSystem, collisionSystem, deformationSystem, renderSystem } from "./engine/physics.js";
import { serializeScene, loadScene } from "./engine/scene.js";
import { saveScene, openScene } from "./engine/fileio.js";
import { spawnBall } from "./game/ball.js";

const stage = document.getElementById("stage");
const worldEl = document.getElementById("world");
const statusEl = document.getElementById("status");

const bounds = { floorY: 560, left: 0, right: 800 };
const world = createWorld();
let gravity = 900;
let fileHandle = null; // reused so repeat Saves overwrite in place, not re-prompt

async function loadDefaultScene() {
  const res = await fetch("./scenes/default.json");
  gravity = loadScene(world, worldEl, await res.json());
}

function toStagePoint(clientX, clientY) {
  const pt = stage.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}

stage.addEventListener("pointerdown", (e) => {
  const { x, y } = toStagePoint(e.clientX, e.clientY);
  spawnBall(world, worldEl, {
    x,
    y: Math.min(y, bounds.floorY - 20),
    radius: 16 + Math.random() * 24,
    color: `hsl(${Math.round(Math.random() * 360)} 55% 60%)`,
    restitution: 0.5 + Math.random() * 0.4,
    friction: 0.1 + Math.random() * 0.3,
  });
});

document.getElementById("save-btn").addEventListener("click", async () => {
  try {
    fileHandle = await saveScene(serializeScene(world, gravity), { handle: fileHandle });
    statusEl.textContent = "Scene saved";
  } catch (err) {
    if (err.name !== "AbortError") statusEl.textContent = `Save failed: ${err.message}`;
  }
});

document.getElementById("open-btn").addEventListener("click", async () => {
  try {
    const { data, handle } = await openScene();
    fileHandle = handle;
    gravity = loadScene(world, worldEl, data);
    statusEl.textContent = "Scene loaded";
  } catch (err) {
    if (err.name !== "AbortError") statusEl.textContent = `Open failed: ${err.message}`;
  }
});

function update(dt) {
  gravitySystem(world, dt, gravity);
  integrateSystem(world, dt);
  collisionSystem(world, bounds);
  deformationSystem(world, dt);
}

function render() {
  renderSystem(world);
}

await loadDefaultScene();
startLoop({ update, render });
