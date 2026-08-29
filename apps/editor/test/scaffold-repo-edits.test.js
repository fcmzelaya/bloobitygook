import { describe, it, expect } from "vitest";
import { addDevScriptToRootPackageJson } from "../src/scaffold/repo-edits.js";

const ROOT_PACKAGE_JSON = JSON.stringify(
  {
    name: "bloobitygook",
    private: true,
    version: "0.1.0",
    packageManager: "pnpm@11.22.0",
    scripts: {
      "dev:play": "pnpm --filter @bloobitygook/play dev",
      build: 'pnpm --filter "./apps/*" -r run build && pnpm compose',
      compose: "node scripts/compose-site.mjs",
      test: "pnpm -r test",
    },
  },
  null,
  2
);

describe("addDevScriptToRootPackageJson", () => {
  it("adds a dev:<id> script", () => {
    const result = JSON.parse(addDevScriptToRootPackageJson(ROOT_PACKAGE_JSON, "pong"));
    expect(result.scripts["dev:pong"]).toBe("pnpm --filter @bloobitygook/pong dev");
  });

  it("leaves the build script untouched — apps/* is discovered dynamically", () => {
    const result = JSON.parse(addDevScriptToRootPackageJson(ROOT_PACKAGE_JSON, "pong"));
    expect(result.scripts.build).toBe('pnpm --filter "./apps/*" -r run build && pnpm compose');
  });

  it("leaves unrelated scripts untouched", () => {
    const result = JSON.parse(addDevScriptToRootPackageJson(ROOT_PACKAGE_JSON, "pong"));
    expect(result.scripts["dev:play"]).toBe("pnpm --filter @bloobitygook/play dev");
    expect(result.scripts.test).toBe("pnpm -r test");
  });
});
