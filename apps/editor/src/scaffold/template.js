// Pure — generates the minimal engine-connected app shell a new game
// starts from. Deliberately has no game logic of its own (not a Tetris
// clone): just enough wiring (SVG stage, createWorld, startLoop) for
// whichever engine packages the new game actually needs to be added on
// top, matching how apps/play and apps/tetris are structured.
export function generateTemplateFiles({ id, title, port }) {
  const base = `apps/${id}`;

  return {
    [`${base}/package.json`]:
      JSON.stringify(
        {
          name: `@bloobitygook/${id}`,
          private: true,
          version: "0.1.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            "@bloobitygook/engine": "workspace:*",
          },
          devDependencies: {
            vite: "^6.0.0",
          },
        },
        null,
        2
      ) + "\n",

    [`${base}/vite.config.js`]: `import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  optimizeDeps: { exclude: ["@bloobitygook/engine"] },
  server: { port: ${port}, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  // Only prefixed for production builds — the composed public site serves
  // this app at /${id}/, but dev should stay at the server root.
  base: command === "build" ? "/${id}/" : "/",
}));
`,

    [`${base}/index.html`]: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>bloobitygook — ${title}</title>
  <style>
    html, body {
      margin: 0;
      height: 100%;
      background: #10131a;
      overflow: hidden;
    }
    #stage {
      display: block;
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <svg id="stage" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="0" width="800" height="600" fill="#1a1f2b" />
    <g id="world"></g>
  </svg>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
`,

    [`${base}/src/main.js`]: `import { createWorld, startLoop } from "@bloobitygook/engine/core";

const world = createWorld();

function update(dt) {
  // Your game logic goes here.
}

function render() {
  // Your rendering goes here.
}

startLoop({ update, render });
`,
  };
}
