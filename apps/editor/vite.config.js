import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      "@bloobitygook/animation",
      "@bloobitygook/behavior",
      "@bloobitygook/engine",
      "@bloobitygook/game-manifest",
      "@bloobitygook/objects",
      "@bloobitygook/platformer",
      "@bloobitygook/svg-import",
      "@bloobitygook/tetris-pieces",
    ],
  },
  server: { port: 5176, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
