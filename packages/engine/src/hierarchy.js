import { destroy, query } from "./world.js";

// Generic ECS parent-child relationship — no physics dependency, so it
// belongs next to world.js rather than in systems.js. A child's transform
// tracks its parent's every frame; nothing here assumes what "transform"
// means beyond x/y, so it works for a physics ball, an archetype
// instance, or anything else with those two fields.
export function attachChild(child, parent, offset = { x: 0, y: 0 }) {
  child.parentId = parent.id;
  child.offset = offset;
}

// Called from render(), not update() — render() already runs every frame
// regardless of Setup/Run mode, so a child visibly tracks its parent even
// while a scene is frozen for editing, and this is a pure position copy
// with no dt needed.
export function hierarchySystem(world) {
  for (const child of query(world, ["parentId", "offset"])) {
    const parent = world.entities.find((e) => e.id === child.parentId);
    // An orphan (parent destroyed via plain `destroy`) just freezes at its
    // last position rather than crashing — acceptable until something
    // actually needs cleanup here.
    if (!parent) continue;
    child.x = parent.x + child.offset.x;
    child.y = parent.y + child.offset.y;
  }
}

// Recursively destroys a subtree, children first — plain `destroy` stays
// untouched since most callers assume simple, non-cascading removal.
export function destroyWithChildren(world, id) {
  for (const child of query(world, ["parentId"]).filter((e) => e.parentId === id)) {
    destroyWithChildren(world, child.id);
  }
  destroy(world, id);
}
