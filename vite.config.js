import { defineConfig } from "vite";

// Relative base so assets work on both:
// - GitHub Pages project URL https://heigeai.github.io/tibo-rest/
// - Custom domain https://tibo.rest/
export default defineConfig({
  base: "./",
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
