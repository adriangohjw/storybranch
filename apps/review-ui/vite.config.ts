import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: path.join(root, "../cli/review/public"),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  root,
  server: {
    proxy: {
      "/api": { changeOrigin: true, target: "http://127.0.0.1:4321" },
      "/images": { changeOrigin: true, target: "http://127.0.0.1:4321" },
    },
  },
});
