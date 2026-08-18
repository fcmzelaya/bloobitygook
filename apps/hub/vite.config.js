import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@bloobitygook/game-manifest"] },
  server: { port: 5179, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
