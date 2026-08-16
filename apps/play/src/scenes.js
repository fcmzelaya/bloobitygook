// Scenes ship baked into the build (no runtime fetch) — drop a new JSON
// file in ../scenes/ and it shows up here automatically, no import list
// to maintain.
const modules = import.meta.glob("../scenes/*.json", { eager: true });

export const scenes = Object.entries(modules).map(([path, mod]) => ({
  id: path.split("/").pop().replace(".json", ""),
  data: mod.default,
}));
