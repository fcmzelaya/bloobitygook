import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@bloobitygook/engine", "@bloobitygook/grid"] },
  server: { port: 5178, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
