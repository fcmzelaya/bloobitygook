import {
  createWorld,
  destroy,
  startLoop,
  gravitySystem,
  integrateSystem,
  collisionSystem,
  ballCollisionSystem,
  deformationSystem,
  renderSystem,
  serializeScene,
  loadScene,
  saveScene,
  openScene,
  spawnBall,
  randomBallColor,
} from "@bloobitygook/engine";
import { findBallAt, isGravityMarkerVisible, isPlaceGravityButtonEnabled, statusText } from "./ui-helpers.js";
import { isCloudEnabled, signIn, signOut, onAuthChange, publishScene, fetchPublishedScene } from "./publish.js";

const stage = document.getElementById("stage");
const worldEl = document.getElementById("world");
const statusEl = document.getElementById("status");
const gravityMarkerEl = document.getElementById("gravity-marker");

const modeSetupBtn = document.getElementById("mode-setup-btn");
const modeRunBtn = document.getElementById("mode-run-btn");
const gravityModeSelect = document.getElementById("gravity-mode");
const gravityMagnitudeInput = document.getElementById("gravity-magnitude");
const placeGravityBtn = document.getElementById("place-gravity-btn");

const inspector = document.getElementById("inspector");
const inspectorClose = document.getElementById("inspector-close");
const propRadius = document.getElementById("prop-radius");
const propColor = document.getElementById("prop-color");
const propRestitution = document.getElementById("prop-restitution");
const propFriction = document.getElementById("prop-friction");
const deleteBtn = document.getElementById("delete-btn");

const sceneIdInput = document.getElementById("scene-id");
const publishBtn = document.getElementById("publish-btn");
const loadCloudBtn = document.getElementById("load-cloud-btn");
const signinBtn = document.getElementById("signin-btn");

const bounds = { floorY: 560, left: 0, right: 800 };
const world = createWorld();
let gravity = { mode: "uniform", magnitude: 900, x: 400, y: 300 };
let fileHandle = null; // reused so repeat Saves overwrite in place, not re-prompt
let mode = "setup"; // "setup" (frozen, editable) or "running" (physics live)
let selected = null;
let placingGravityPoint = false;
let currentUser = null;

async function loadDefaultScene() {
  const res = await fetch("./scenes/default.json");
  gravity = loadScene(world, worldEl, await res.json());
  clearSelection();
  refreshGravityUI();
}

function toStagePoint(clientX, clientY) {
  const pt = stage.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}

function selectEntity(entity) {
  if (selected) selected.circleEl.removeAttribute("stroke");
  selected = entity;
  selected.circleEl.setAttribute("stroke", "#ffffff");
  selected.circleEl.setAttribute("stroke-width", "3");
  propRadius.value = entity.radius;
  propColor.value = entity.color;
  propRestitution.value = entity.restitution;
  propFriction.value = entity.friction;
  inspector.classList.add("visible");
}

function clearSelection() {
  if (selected) selected.circleEl.removeAttribute("stroke");
  selected = null;
  inspector.classList.remove("visible");
}

function syncBallVisual(entity) {
  entity.circleEl.setAttribute("r", entity.radius);
  entity.circleEl.setAttribute("fill", entity.color);
}

function updateGravityMarker() {
  if (isGravityMarkerVisible(gravity)) {
    gravityMarkerEl.style.display = "";
    gravityMarkerEl.setAttribute("transform", `translate(${gravity.x} ${gravity.y})`);
  } else {
    gravityMarkerEl.style.display = "none";
  }
}

function updatePlaceGravityBtnState() {
  placeGravityBtn.disabled = !isPlaceGravityButtonEnabled(mode, gravity);
}

function cancelGravityPlacement() {
  placingGravityPoint = false;
  placeGravityBtn.classList.remove("active");
}

function refreshGravityUI() {
  gravityModeSelect.value = gravity.mode;
  gravityMagnitudeInput.value = gravity.magnitude;
  updateGravityMarker();
  updatePlaceGravityBtnState();
}

function setMode(next) {
  mode = next;
  modeSetupBtn.classList.toggle("active", mode === "setup");
  modeRunBtn.classList.toggle("active", mode === "running");
  if (mode !== "setup") {
    cancelGravityPlacement();
    clearSelection();
  }
  statusEl.textContent = statusText(mode);
  updatePlaceGravityBtnState();
}

stage.addEventListener("pointerdown", (e) => {
  const { x, y } = toStagePoint(e.clientX, e.clientY);

  if (placingGravityPoint) {
    gravity.x = x;
    gravity.y = y;
    cancelGravityPlacement();
    updateGravityMarker();
    statusEl.textContent = "Gravity point placed";
    return;
  }

  if (mode !== "setup") return;

  const hit = findBallAt(world, x, y);
  if (hit) {
    selectEntity(hit);
    return;
  }

  const ball = spawnBall(world, worldEl, {
    x,
    y: Math.min(y, bounds.floorY - 20),
    radius: 16 + Math.random() * 24,
    color: randomBallColor(),
    restitution: 0.5 + Math.random() * 0.4,
    friction: 0.1 + Math.random() * 0.3,
  });
  selectEntity(ball);
});

modeSetupBtn.addEventListener("click", () => setMode("setup"));
modeRunBtn.addEventListener("click", () => setMode("running"));

gravityModeSelect.addEventListener("change", () => {
  gravity.mode = gravityModeSelect.value;
  cancelGravityPlacement();
  updateGravityMarker();
  updatePlaceGravityBtnState();
});

gravityMagnitudeInput.addEventListener("input", () => {
  gravity.magnitude = Number(gravityMagnitudeInput.value);
});

placeGravityBtn.addEventListener("click", () => {
  if (placeGravityBtn.disabled) return;
  placingGravityPoint = true;
  placeGravityBtn.classList.add("active");
  statusEl.textContent = "Click the stage to place the gravity point";
});

inspectorClose.addEventListener("click", clearSelection);

propRadius.addEventListener("input", () => {
  if (!selected) return;
  selected.radius = Number(propRadius.value) || selected.radius;
  syncBallVisual(selected);
});
propColor.addEventListener("input", () => {
  if (!selected) return;
  selected.color = propColor.value;
  syncBallVisual(selected);
});
propRestitution.addEventListener("input", () => {
  if (!selected) return;
  selected.restitution = Number(propRestitution.value);
});
propFriction.addEventListener("input", () => {
  if (!selected) return;
  selected.friction = Number(propFriction.value);
});
deleteBtn.addEventListener("click", () => {
  if (!selected) return;
  destroy(world, selected.id);
  selected.el.remove();
  clearSelection();
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
    clearSelection();
    refreshGravityUI();
    statusEl.textContent = "Scene loaded";
  } catch (err) {
    if (err.name !== "AbortError") statusEl.textContent = `Open failed: ${err.message}`;
  }
});

if (isCloudEnabled) {
  document.querySelectorAll(".cloud-only").forEach((el) => el.classList.remove("hidden"));
  onAuthChange((user) => {
    currentUser = user;
    signinBtn.textContent = user ? `Sign out (${user.email})` : "Sign in";
    publishBtn.disabled = !user;
  });
}

signinBtn.addEventListener("click", async () => {
  try {
    if (currentUser) await signOut();
    else await signIn();
  } catch (err) {
    statusEl.textContent = `Sign-in failed: ${err.message}`;
  }
});

publishBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  const sceneId = sceneIdInput.value.trim() || "default";
  try {
    await publishScene(sceneId, serializeScene(world, gravity));
    statusEl.textContent = `Published "${sceneId}"`;
  } catch (err) {
    statusEl.textContent = `Publish failed: ${err.message}`;
  }
});

loadCloudBtn.addEventListener("click", async () => {
  const sceneId = sceneIdInput.value.trim() || "default";
  try {
    const data = await fetchPublishedScene(sceneId);
    gravity = loadScene(world, worldEl, data);
    clearSelection();
    refreshGravityUI();
    statusEl.textContent = `Loaded "${sceneId}" from cloud`;
  } catch (err) {
    statusEl.textContent = `Cloud load failed: ${err.message}`;
  }
});

function update(dt) {
  if (mode !== "running") return; // setup mode freezes the simulation for editing
  gravitySystem(world, dt, gravity);
  integrateSystem(world, dt);
  collisionSystem(world, bounds);
  ballCollisionSystem(world);
  deformationSystem(world, dt);
}

function render() {
  renderSystem(world);
}

(async () => {
  await loadDefaultScene();
  setMode("setup");
  startLoop({ update, render });
})();
