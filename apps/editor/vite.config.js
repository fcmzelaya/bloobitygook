import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@bloobitygook/engine", "@bloobitygook/game-manifest"] },
  server: { port: 5176, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
});
