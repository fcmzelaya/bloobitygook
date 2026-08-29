// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createGamePR } from "../src/github-wizard.js";

function toBase64(str) {
  return Buffer.from(str, "utf-8").toString("base64");
}

const ROOT_PACKAGE_JSON = JSON.stringify({
  scripts: { build: 'pnpm --filter "./apps/*" -r run build && pnpm compose' },
});

function makeFakeOctokit() {
  return {
    git: {
      getRef: vi.fn().mockResolvedValue({ data: { object: { sha: "base-sha-123" } } }),
      createRef: vi.fn().mockResolvedValue({}),
    },
    repos: {
      getContent: vi.fn(() =>
        Promise.resolve({ data: { content: toBase64(ROOT_PACKAGE_JSON), sha: "root-pkg-sha" } })
      ),
      createOrUpdateFileContents: vi.fn().mockResolvedValue({}),
    },
    pulls: {
      create: vi.fn().mockResolvedValue({ data: { html_url: "https://github.com/fcmzelaya/bloobitygook/pull/1" } }),
    },
  };
}

describe("createGamePR", () => {
  it("creates a branch off main's current sha", async () => {
    const octokit = makeFakeOctokit();
    await createGamePR(octokit, { id: "pong", title: "Pong", description: "", port: 5181 });

    expect(octokit.git.getRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "heads/main" })
    );
    expect(octokit.git.createRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: "refs/heads/wizard/pong", sha: "base-sha-123" })
    );
  });

  it("writes the 4 template files plus the 1 patched shared file, all to the new branch", async () => {
    const octokit = makeFakeOctokit();
    await createGamePR(octokit, { id: "pong", title: "Pong", description: "", port: 5181 });

    const writtenPaths = octokit.repos.createOrUpdateFileContents.mock.calls.map((call) => call[0].path);
    expect(writtenPaths.sort()).toEqual(
      [
        "apps/pong/index.html",
        "apps/pong/package.json",
        "apps/pong/src/main.js",
        "apps/pong/vite.config.js",
        "package.json",
      ].sort()
    );
    for (const call of octokit.repos.createOrUpdateFileContents.mock.calls) {
      expect(call[0].branch).toBe("wizard/pong");
    }
  });

  it("passes the patched shared file's fetched sha back, as GitHub's contents API requires for an update (not a create)", async () => {
    const octokit = makeFakeOctokit();
    await createGamePR(octokit, { id: "pong", title: "Pong", description: "", port: 5181 });

    const rootPkgCall = octokit.repos.createOrUpdateFileContents.mock.calls.find((call) => call[0].path === "package.json");
    expect(rootPkgCall[0].sha).toBe("root-pkg-sha");

    // The 4 freshly generated apps/<id>/* files are brand new — no sha exists for them yet.
    const newFileCall = octokit.repos.createOrUpdateFileContents.mock.calls.find(
      (call) => call[0].path === "apps/pong/package.json"
    );
    expect(newFileCall[0].sha).toBeUndefined();
  });

  it("patches the shared file's fetched content, not a hardcoded copy", async () => {
    const octokit = makeFakeOctokit();
    await createGamePR(octokit, { id: "pong", title: "Pong", description: "", port: 5181 });

    const rootPkgCall = octokit.repos.createOrUpdateFileContents.mock.calls.find(
      (call) => call[0].path === "package.json"
    );
    const decoded = Buffer.from(rootPkgCall[0].content, "base64").toString("utf-8");
    expect(JSON.parse(decoded).scripts["dev:pong"]).toBe("pnpm --filter @bloobitygook/pong dev");
  });

  it("opens a PR from the new branch to main and returns its URL", async () => {
    const octokit = makeFakeOctokit();
    const url = await createGamePR(octokit, { id: "pong", title: "Pong", description: "A paddle game", port: 5181 });

    expect(octokit.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({ base: "main", head: "wizard/pong", title: "Add game: Pong" })
    );
    expect(url).toBe("https://github.com/fcmzelaya/bloobitygook/pull/1");
  });

  it("scaffolds a full Tetris instance instead of the blank shell when gameType is 'tetris'", async () => {
    const octokit = makeFakeOctokit();
    await createGamePR(octokit, {
      id: "puzzler",
      title: "Puzzler",
      description: "",
      port: 5183,
      gameType: "tetris",
      tetrisConfig: { cols: 8, rows: 16 },
    });

    const writtenPaths = octokit.repos.createOrUpdateFileContents.mock.calls.map((call) => call[0].path);
    expect(writtenPaths).toContain("apps/puzzler/src/main.js");
    expect(writtenPaths).toContain("apps/puzzler/src/config.json");

    const mainJsCall = octokit.repos.createOrUpdateFileContents.mock.calls.find(
      (call) => call[0].path === "apps/puzzler/src/main.js"
    );
    const decoded = Buffer.from(mainJsCall[0].content, "base64").toString("utf-8");
    expect(decoded).toContain('import config from "./config.json"');
    expect(decoded).toContain('from "@bloobitygook/tetris-pieces"');

    const configCall = octokit.repos.createOrUpdateFileContents.mock.calls.find(
      (call) => call[0].path === "apps/puzzler/src/config.json"
    );
    const decodedConfig = JSON.parse(Buffer.from(configCall[0].content, "base64").toString("utf-8"));
    expect(decodedConfig.bounds).toEqual({ cols: 8, rows: 16 });
  });

  it("throws on an unknown game type instead of silently falling back to blank", async () => {
    const octokit = makeFakeOctokit();
    await expect(
      createGamePR(octokit, { id: "mystery", title: "Mystery", description: "", port: 5184, gameType: "platformer" })
    ).rejects.toThrow(/Unknown game type/);
  });
});
