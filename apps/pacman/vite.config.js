import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  optimizeDeps: {
    exclude: ["@bloobitygook/engine", "@bloobitygook/animation", "@bloobitygook/triggers", "@bloobitygook/behavior"],
  },
  server: { port: 5182, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  base: command === "build" ? "/pacman/" : "/",
}));
