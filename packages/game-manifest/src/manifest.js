// Shape of a games/<id>/manifest.json entry in Storage. Pure — no
// Firebase dependency here at all, so both apps/hub (public reads) and
// apps/editor (authenticated writes, once the wizard exists) can depend
// on this without either one pulling in the other's I/O concerns.

const REQUIRED_FIELDS = ["id", "title", "route"];

// Fills in sane defaults for the fields a caller usually doesn't want to
// think about (timestamps, publish state) while requiring the ones that
// genuinely need a human decision (id, title, route).
export function createManifestEntry(fields) {
  for (const field of REQUIRED_FIELDS) {
    if (!fields[field]) throw new Error(`Manifest entry is missing required field "${field}"`);
  }
  return {
    id: fields.id,
    title: fields.title,
    description: fields.description ?? "",
    route: fields.route,
    thumbnail: fields.thumbnail ?? null,
    published: fields.published ?? false,
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}

export function isValidManifestEntry(entry) {
  if (entry == null || typeof entry !== "object") return false;
  return REQUIRED_FIELDS.every((field) => typeof entry[field] === "string" && entry[field].length > 0);
}
