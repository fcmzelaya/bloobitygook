// Wraps the File System Access API (Chrome/Edge) so "Save" writes the
// actual file on disk in place, with no server involved — just a static
// page. Falls back to a plain download/upload on browsers that don't
// support it (Firefox, Safari), since "save" there can only ever mean
// "hand the user a new file."
export const hasFileSystemAccess = "showSaveFilePicker" in window;

const JSON_FILE_TYPE = {
  description: "Scene JSON",
  accept: { "application/json": [".json"] },
};

// Pass an existing `handle` to overwrite the same file silently (repeat
// saves during a session); omit it to prompt a save-as dialog once.
export async function saveScene(data, { suggestedName = "scene.json", handle = null } = {}) {
  const json = JSON.stringify(data, null, 2);

  if (hasFileSystemAccess) {
    const fileHandle = handle ?? await window.showSaveFilePicker({
      suggestedName,
      types: [JSON_FILE_TYPE],
    });
    const writable = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    return fileHandle;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
  return null;
}

// Returns { data, handle } — handle is null on the fallback path, since
// a plain <input type=file> gives no way to write back to the same file.
export async function openScene() {
  if (hasFileSystemAccess) {
    const [fileHandle] = await window.showOpenFilePicker({ types: [JSON_FILE_TYPE] });
    const file = await fileHandle.getFile();
    return { data: JSON.parse(await file.text()), handle: fileHandle };
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) { reject(new Error("No file selected")); return; }
      resolve({ data: JSON.parse(await file.text()), handle: null });
    };
    input.click();
  });
}
