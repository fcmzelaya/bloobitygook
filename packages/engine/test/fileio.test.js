import { describe, it, expect } from "vitest";
import { hasFileSystemAccess } from "../src/fileio.js";

describe("fileio", () => {
  it("importing outside a browser (no window global) doesn't throw", () => {
    // Regression test: this file used to reference `window` at module scope
    // unguarded, which crashed on import in any non-browser context (Node,
    // tests, a future server-side use of the engine package).
    expect(typeof hasFileSystemAccess).toBe("boolean");
    expect(hasFileSystemAccess).toBe(false);
  });
});
