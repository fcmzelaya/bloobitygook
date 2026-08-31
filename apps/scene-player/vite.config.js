import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  optimizeDeps: {
    exclude: [
      "@bloobitygook/animation",
      "@bloobitygook/behavior",
      "@bloobitygook/engine",
      "@bloobitygook/objects",
      "@bloobitygook/platformer",
      "@bloobitygook/triggers",
    ],
  },
  server: { port: 5186, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  base: command === "build" ? "/play-scene/" : "/",
}));
