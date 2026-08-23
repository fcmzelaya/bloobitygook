// Event-driven actions (move/rotate/hard-drop), as opposed to runStage's
// continuous per-tick systems — these fire once per input event, not
// every frame. `stage.controls` maps an action name to a handler function
// the stage assembly defines; dispatch() just looks it up and calls it
// with whatever arguments the caller passes through. An unknown action is
// a silent no-op, not an error — matching how an unbound key already
// does nothing in every app in this repo.
export function createActionDispatcher(stage) {
  return function dispatch(action, ...args) {
    const handler = stage.controls[action];
    if (!handler) return;
    return handler(...args);
  };
}
