// Variable-timestep rAF loop. dt is clamped so a dropped frame (tab
// backgrounded, breakpoint hit) doesn't cause entities to teleport.
const MAX_DT = 1 / 20; // seconds

export function startLoop({ update, render }) {
  let lastTime = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame((now) => {
    lastTime = now;
    requestAnimationFrame(frame);
  });

  return () => { running = false; };
}
