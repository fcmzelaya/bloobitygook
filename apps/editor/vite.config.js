import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@bloobitygook/engine"] },
  server: { port: 5176, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
