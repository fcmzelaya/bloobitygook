// Entities are plain objects. Components are just fields on them.
// Systems are functions that filter entities by which fields they have.
// No inheritance hierarchy — composition only.

export function createWorld() {
  return { entities: [], nextId: 1 };
}

export function spawn(world, components) {
  const entity = { id: world.nextId++, ...components };
  world.entities.push(entity);
  return entity;
}

export function destroy(world, id) {
  const index = world.entities.findIndex((e) => e.id === id);
  if (index !== -1) world.entities.splice(index, 1);
}

// Returns entities that have every listed field.
export function query(world, keys) {
  return world.entities.filter((e) => keys.every((k) => k in e));
}

// Removes every entity — used when loading a new scene over an old one.
export function clear(world) {
  world.entities.length = 0;
}
