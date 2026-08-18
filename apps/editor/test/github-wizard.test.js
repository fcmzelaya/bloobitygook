// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createGamePR } from "../src/github-wizard.js";

function toBase64(str) {
  return Buffer.from(str, "utf-8").toString("base64");
}

const ROOT_PACKAGE_JSON = JSON.stringify({
  scripts: { build: "pnpm --filter @bloobitygook/hub build && pnpm compose" },
});
const COMPOSE_SCRIPT = `const APPS = [\n  ["hub", ""],\n];\n`;

function makeFakeOctokit() {
  return {
    git: {
      getRef: vi.fn().mockResolvedValue({ data: { object: { sha: "base-sha-123" } } }),
      createRef: vi.fn().mockResolvedValue({}),
    },
    repos: {
      getContent: vi.fn(({ path }) => {
        const content = path === "package.json" ? ROOT_PACKAGE_JSON : COMPOSE_SCRIPT;
        return Promise.resolve({ data: { content: toBase64(content) } });
      }),
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

  it("writes the 4 template files plus the 2 patched shared files, all to the new branch", async () => {
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
        "scripts/compose-site.mjs",
      ].sort()
    );
    for (const call of octokit.repos.createOrUpdateFileContents.mock.calls) {
      expect(call[0].branch).toBe("wizard/pong");
    }
  });

  it("patches the shared files' fetched content, not a hardcoded copy", async () => {
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
});
