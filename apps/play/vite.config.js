import { defineConfig } from "vite";

export default defineConfig({
  // A workspace-linked zero-build package looks like a stable third-party
  // dep to esbuild's pre-bundler, which then stale-caches it — edits to
  // packages/engine wouldn't hot-reload without this.
  optimizeDeps: { exclude: ["@bloobitygook/engine"] },
  server: { port: 5175, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
