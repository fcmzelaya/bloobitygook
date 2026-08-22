import { Octokit } from "@octokit/rest";
import { generateTemplateFiles } from "./scaffold/template.js";
import { addDevScriptToRootPackageJson, addAppToComposeScript } from "./scaffold/repo-edits.js";

const OWNER = "fcmzelaya";
const REPO = "bloobitygook";
const BASE_BRANCH = "main";

export function createGithubClient(token) {
  return new Octokit({ auth: token });
}

// Takes an Octokit-shaped client as an explicit argument (rather than
// constructing one internally) so this orchestration can be unit tested
// against a fake client, no real network calls involved.
export async function createGamePR(octokit, { id, title, description, port }) {
  const branch = `wizard/${id}`;

  const { data: baseRef } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: `heads/${BASE_BRANCH}` });
  await octokit.git.createRef({
    owner: OWNER,
    repo: REPO,
    ref: `refs/heads/${branch}`,
    sha: baseRef.object.sha,
  });

  const files = generateTemplateFiles({ id, title, port });

  const rootPackageJson = await getFileContent(octokit, "package.json", branch);
  files["package.json"] = addDevScriptToRootPackageJson(rootPackageJson, id);

  const composeScript = await getFileContent(octokit, "scripts/compose-site.mjs", branch);
  files["scripts/compose-site.mjs"] = addAppToComposeScript(composeScript, id);

  for (const [path, content] of Object.entries(files)) {
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      branch,
      path,
      message: `wizard: add ${path} for "${id}"`,
      content: toBase64(content),
    });
  }

  const { data: pr } = await octokit.pulls.create({
    owner: OWNER,
    repo: REPO,
    base: BASE_BRANCH,
    head: branch,
    title: `Add game: ${title}`,
    body: buildPrBody({ id, title, description, port }),
  });

  return pr.html_url;
}

async function getFileContent(octokit, path, ref) {
  const { data } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path, ref });
  return fromBase64(data.content);
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function buildPrBody({ id, title, description, port }) {
  return [
    "Scaffolded via the in-editor wizard — this is the minimal engine-connected shell, not a finished game.",
    "",
    `**Game:** ${title} (\`${id}\`)`,
    description ? `**Description:** ${description}` : null,
    `**Dev port:** ${port} — adjust \`apps/${id}/vite.config.js\` if that conflicts with something else you're running locally.`,
    "",
    "### Still needs a human",
    "- [ ] Write the actual game",
    `- [ ] Once merged and deployed, publish a manifest entry for it from the editor's "Manage Games" panel so it shows up on the hub`,
  ]
    .filter(Boolean)
    .join("\n");
}
