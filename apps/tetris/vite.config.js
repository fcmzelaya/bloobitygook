import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  optimizeDeps: { exclude: ["@bloobitygook/engine", "@bloobitygook/grid"] },
  server: { port: 5178, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  base: command === "build" ? "/tetris/" : "/",
}));
