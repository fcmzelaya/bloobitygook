import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: [
      "@bloobitygook/engine",
      "@bloobitygook/objects",
      "@bloobitygook/animation",
      "@bloobitygook/behavior",
      "@bloobitygook/platformer",
    ],
  },
  server: { port: 5185, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
