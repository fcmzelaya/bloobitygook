import { createWorld, startLoop } from "@bloobitygook/engine/core";
import {
  loadScene,
  spawnBall,
  randomBallColor,
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
} from "@bloobitygook/engine/physics";
import { scenes } from "./scenes.js";

const stage = document.getElementById("stage");
const worldEl = document.getElementById("world");
const sceneSelect = document.getElementById("scene-select");

const bounds = { floorY: 560, left: 0, right: 800 };
const world = createWorld();
let gravity = { mode: "uniform", magnitude: 900, x: 400, y: 300 };

function toStagePoint(clientX, clientY) {
  const pt = stage.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}

function loadSceneById(id) {
  const scene = scenes.find((s) => s.id === id) ?? scenes[0];
  if (!scene) return;
  gravity = loadScene(world, worldEl, scene.data);
}

if (scenes.length > 1) {
  sceneSelect.style.display = "";
  for (const s of scenes) {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.id;
    sceneSelect.appendChild(option);
  }
  sceneSelect.addEventListener("change", () => loadSceneById(sceneSelect.value));
}

stage.addEventListener("pointerdown", (e) => {
  const { x, y } = toStagePoint(e.clientX, e.clientY);
  spawnBall(world, worldEl, {
    x,
    y: Math.min(y, bounds.floorY - 20),
    radius: 16 + Math.random() * 24,
    color: randomBallColor(),
    restitution: 0.5 + Math.random() * 0.4,
    friction: 0.1 + Math.random() * 0.3,
  });
});

function update(dt) {
  gravitySystem(world, dt, gravity);
  integrateSystem(world, dt);
  collisionSystem(world, bounds);
  ballCollisionSystem(world);
  deformationSystem(world, dt);
}

function render() {
  renderSystem(world);
}

loadSceneById(scenes[0]?.id);
startLoop({ update, render });
