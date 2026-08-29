import { describe, it, expect } from "vitest";
import { generateTetrisTemplateFiles } from "../src/scaffold/tetris-template.js";

describe("generateTetrisTemplateFiles", () => {
  const defaults = generateTetrisTemplateFiles({ id: "puzzler", title: "Puzzler", port: 5183 });

  it("generates exactly the five expected files under apps/<id>/", () => {
    expect(Object.keys(defaults).sort()).toEqual([
      "apps/puzzler/index.html",
      "apps/puzzler/package.json",
      "apps/puzzler/src/config.json",
      "apps/puzzler/src/main.js",
      "apps/puzzler/vite.config.js",
    ]);
  });

  it("package.json depends on engine, grid, triggers, stage, and tetris-pieces", () => {
    const pkg = JSON.parse(defaults["apps/puzzler/package.json"]);
    expect(pkg.name).toBe("@bloobitygook/puzzler");
    expect(pkg.dependencies).toMatchObject({
      "@bloobitygook/engine": "workspace:*",
      "@bloobitygook/grid": "workspace:*",
      "@bloobitygook/triggers": "workspace:*",
      "@bloobitygook/stage": "workspace:*",
      "@bloobitygook/tetris-pieces": "workspace:*",
    });
  });

  it("package.json declares its own composed-site route, so compose-site.mjs needs no central edit", () => {
    const pkg = JSON.parse(defaults["apps/puzzler/package.json"]);
    expect(pkg.bloobitygook.route).toBe("puzzler");
  });

  it("vite.config.js wires the port, route base, and excludes all five workspace deps", () => {
    const config = defaults["apps/puzzler/vite.config.js"];
    expect(config).toContain("port: 5183");
    expect(config).toContain('"/puzzler/"');
    for (const dep of ["engine", "grid", "triggers", "stage", "tetris-pieces"]) {
      expect(config).toContain(`@bloobitygook/${dep}`);
    }
  });

  it("index.html uses the given title and sizes the board to the default 10x20 @ 24px", () => {
    const html = defaults["apps/puzzler/index.html"];
    expect(html).toContain("bloobitygook — Puzzler");
    expect(html).toContain('viewBox="0 0 240 480"');
  });

  it("defaults reproduce apps/tetris's own constants in the generated config.json, not baked into main.js", () => {
    const mainJs = defaults["apps/puzzler/src/main.js"];
    const config = JSON.parse(defaults["apps/puzzler/src/config.json"]);
    expect(config.bounds).toEqual({ cols: 10, rows: 20 });
    expect(config.cellSize).toBe(24);
    expect(config.spawnOrigin).toEqual({ col: 4, row: -1 });
    expect(config.baseDropIntervalMs).toBe(700);
    expect(config.pieceSet).toEqual(["o", "j", "l", "i", "t", "z", "s"]);
    expect(mainJs).toContain('import config from "./config.json"');
    expect(mainJs).not.toContain("const BOUNDS = {");
  });

  it("bakes a custom board size, cell size, and piece subset into config.json, not main.js", () => {
    const files = generateTetrisTemplateFiles({
      id: "mini",
      title: "Mini",
      port: 5184,
      cols: 6,
      rows: 12,
      cellSize: 32,
      pieceSet: ["o", "t", "i"],
      dropIntervalMs: 400,
      linesPerLevel: 3,
    });
    const html = files["apps/mini/index.html"];
    const config = JSON.parse(files["apps/mini/src/config.json"]);

    expect(html).toContain('viewBox="0 0 192 384"'); // 6*32 x 12*32
    expect(config.bounds).toEqual({ cols: 6, rows: 12 });
    expect(config.cellSize).toBe(32);
    expect(config.spawnOrigin).toEqual({ col: 2, row: -1 }); // floor(6/2)-1
    expect(config.pieceSet).toEqual(["o", "t", "i"]);
    expect(config.baseDropIntervalMs).toBe(400);
    expect(config.linesPerLevel).toBe(3);
  });

  it("main.js imports the generic capabilities, not any Tetris-owned logic package", () => {
    const mainJs = defaults["apps/puzzler/src/main.js"];
    expect(mainJs).toContain('from "@bloobitygook/grid"');
    expect(mainJs).toContain('from "@bloobitygook/triggers"');
    expect(mainJs).toContain('from "@bloobitygook/stage"');
    expect(mainJs).toContain('from "@bloobitygook/tetris-pieces"');
  });
});
