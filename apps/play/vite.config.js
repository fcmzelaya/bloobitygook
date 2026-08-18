import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // A workspace-linked zero-build package looks like a stable third-party
  // dep to esbuild's pre-bundler, which then stale-caches it — edits to
  // packages/engine wouldn't hot-reload without this.
  optimizeDeps: { exclude: ["@bloobitygook/engine"] },
  server: { port: 5175, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  // Only prefixed for production builds — the composed public site serves
  // this app at /blob/, but dev should stay at the server root so local
  // dev URLs don't need to change.
  base: command === "build" ? "/blob/" : "/",
}));
