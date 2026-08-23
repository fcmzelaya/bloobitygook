// @vitest-environment jsdom
//
// main.js is now thin assembly/wiring code, not owned game-rule logic —
// the actual rules (collision, spawning, gravity, tiered goal detection,
// transform-attempt-and-reject) are unit/integration tested where they
// live: packages/grid, packages/triggers, packages/stage,
// packages/tetris-pieces. This test exercises the assembly end-to-end
// through its only real interface (DOM + keyboard events, since main.js
// exports nothing and runs entirely for its side effects), confirming
// the pieces are actually wired together correctly.
//
// One test, one module import: main.js registers a real global keydown
// listener at import time with no teardown hook, so re-importing it
// per-`it()` (even with vi.resetModules()) would stack up stale listeners
// on the same jsdom `window` across tests in this file. A single
// sequential walk through boot -> hard-drop-to-game-over -> restart
// avoids that entirely.
import { describe, it, expect } from "vitest";

document.body.innerHTML = `
  <svg id="stage"><g id="world"></g></svg>
  <div id="score"></div>
  <div id="level"></div>
  <div id="status"></div>
  <svg id="next-piece-stage"><g id="next-piece"></g></svg>
`;

function pressKey(key) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("apps/tetris main (stage assembly)", () => {
  it("boots, plays via hard drop until game over, then restarts", async () => {
    await import("../src/main.js");

    // Boots with one falling piece, default score/level/status, and a
    // next-piece preview already rendered.
    expect(document.getElementById("score").textContent).toBe("0");
    expect(document.getElementById("level").textContent).toBe("Level 1");
    expect(document.getElementById("status").textContent).toBe("Arrow keys to play");
    expect(document.getElementById("world").children.length).toBe(1);
    expect(document.getElementById("next-piece").children.length).toBe(4);

    // Hard-dropping repeatedly, with no horizontal movement, stacks
    // pieces at the fixed spawn column until the board tops out —
    // regardless of which random pieces get drawn, this must eventually
    // end the game, exercising applyGridGravity/attemptTransform,
    // lockPiece, and the spawn-blocked game-over path together.
    const status = document.getElementById("status");
    let toppedOut = false;
    for (let i = 0; i < 400; i++) {
      pressKey(" ");
      if (status.classList.contains("game-over")) {
        toppedOut = true;
        break;
      }
    }
    expect(toppedOut).toBe(true);
    expect(status.textContent).toMatch(/Game over/);
    expect(document.getElementById("world").children.length).toBeGreaterThan(0);

    // Any key restarts: board clears, score/level/status reset.
    pressKey("ArrowLeft");
    expect(status.classList.contains("game-over")).toBe(false);
    expect(status.textContent).toBe("Arrow keys to play");
    expect(document.getElementById("score").textContent).toBe("0");
    expect(document.getElementById("level").textContent).toBe("Level 1");
  });
});
