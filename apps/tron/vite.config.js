import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  optimizeDeps: { exclude: ["@bloobitygook/engine"] },
  server: { port: 5181, strictPort: true, fs: { allow: [".."] } },
  build: { outDir: "dist" },
  // Only prefixed for production builds — the composed public site serves
  // this app at /tron/, but dev should stay at the server root.
  base: command === "build" ? "/tron/" : "/",
}));
