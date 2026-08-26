import { createWorld, startLoop } from "@bloobitygook/engine/core";

const world = createWorld();

function update(dt) {
  // Your game logic goes here.
}

function render() {
  // Your rendering goes here.
}

startLoop({ update, render });
