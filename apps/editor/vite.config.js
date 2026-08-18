import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@bloobitygook/engine", "@bloobitygook/game-manifest"] },
  server: { port: 5176, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
