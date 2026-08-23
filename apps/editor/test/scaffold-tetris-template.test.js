import { describe, it, expect } from "vitest";
import { generateTetrisTemplateFiles } from "../src/scaffold/tetris-template.js";

describe("generateTetrisTemplateFiles", () => {
  const defaults = generateTetrisTemplateFiles({ id: "puzzler", title: "Puzzler", port: 5183 });

  it("generates exactly the four expected files under apps/<id>/", () => {
    expect(Object.keys(defaults).sort()).toEqual([
      "apps/puzzler/index.html",
      "apps/puzzler/package.json",
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

  it("defaults reproduce apps/tetris's own constants when only id/title/port are given", () => {
    const mainJs = defaults["apps/puzzler/src/main.js"];
    expect(mainJs).toContain("const BOUNDS = { cols: 10, rows: 20 };");
    expect(mainJs).toContain("const CELL_SIZE = 24;");
    expect(mainJs).toContain("const SPAWN_ORIGIN = { col: 4, row: -1 };");
    expect(mainJs).toContain("const BASE_DROP_INTERVAL_MS = 700;");
    expect(mainJs).toContain('const PIECE_SET = ["o","j","l","i","t","z","s"];');
  });

  it("bakes a custom board size, cell size, and piece subset as literals", () => {
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
    const mainJs = files["apps/mini/src/main.js"];

    expect(html).toContain('viewBox="0 0 192 384"'); // 6*32 x 12*32
    expect(mainJs).toContain("const BOUNDS = { cols: 6, rows: 12 };");
    expect(mainJs).toContain("const CELL_SIZE = 32;");
    expect(mainJs).toContain("const SPAWN_ORIGIN = { col: 2, row: -1 };"); // floor(6/2)-1
    expect(mainJs).toContain('const PIECE_SET = ["o","t","i"];');
    expect(mainJs).toContain("const BASE_DROP_INTERVAL_MS = 400;");
    expect(mainJs).toContain("const LINES_PER_LEVEL = 3;");
  });

  it("main.js imports the generic capabilities, not any Tetris-owned logic package", () => {
    const mainJs = defaults["apps/puzzler/src/main.js"];
    expect(mainJs).toContain('from "@bloobitygook/grid"');
    expect(mainJs).toContain('from "@bloobitygook/triggers"');
    expect(mainJs).toContain('from "@bloobitygook/stage"');
    expect(mainJs).toContain('from "@bloobitygook/tetris-pieces"');
  });
});
