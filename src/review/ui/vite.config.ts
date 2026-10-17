import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "../../.."),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: path.join(root, "../public"),
  },
  plugins: [react(), tailwindcss()],
  root,
  server: {
    proxy: {
      "/api": { changeOrigin: true, target: "http://127.0.0.1:4321" },
      "/images": { changeOrigin: true, target: "http://127.0.0.1:4321" },
    },
  },
});
