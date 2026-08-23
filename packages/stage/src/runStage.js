// Per-tick systems (e.g. gravity) — a stage only lists the systems it
// actually needs, so nothing here assumes any particular set exists.
// `stage.systems` is an array of {fn, config} pairs; each fn is called as
// fn(world, dt, config), matching packages/engine's own established
// system-function convention ("systems are plain functions that query the
// world and mutate matches").
export function runStage(stage, world, dt) {
  for (const { fn, config } of stage.systems) fn(world, dt, config);
}
