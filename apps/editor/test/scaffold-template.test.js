import { describe, it, expect } from "vitest";
import { generateTemplateFiles } from "../src/scaffold/template.js";

describe("generateTemplateFiles", () => {
  const files = generateTemplateFiles({ id: "pong", title: "Pong", port: 5181 });

  it("generates exactly the four expected files under apps/<id>/", () => {
    expect(Object.keys(files).sort()).toEqual([
      "apps/pong/index.html",
      "apps/pong/package.json",
      "apps/pong/src/main.js",
      "apps/pong/vite.config.js",
    ]);
  });

  it("package.json has a valid, correctly-named workspace package", () => {
    const pkg = JSON.parse(files["apps/pong/package.json"]);
    expect(pkg.name).toBe("@bloobitygook/pong");
    expect(pkg.dependencies["@bloobitygook/engine"]).toBe("workspace:*");
    expect(pkg.scripts.build).toBe("vite build");
  });

  it("package.json declares its own composed-site route, so compose-site.mjs needs no central edit", () => {
    const pkg = JSON.parse(files["apps/pong/package.json"]);
    expect(pkg.bloobitygook.route).toBe("pong");
  });

  it("vite.config.js wires the given port and route base", () => {
    const config = files["apps/pong/vite.config.js"];
    expect(config).toContain("port: 5181");
    expect(config).toContain('"/pong/"');
  });

  it("index.html uses the given title", () => {
    expect(files["apps/pong/index.html"]).toContain("bloobitygook — Pong");
  });

  it("main.js imports from the workspace engine package's core subpath", () => {
    expect(files["apps/pong/src/main.js"]).toContain('from "@bloobitygook/engine/core"');
  });
});
