import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const reviewUiSrc = path.join(root, "../review-ui/src");

const cloudflareBuild =
  process.env.CLOUDFLARE === "1" || process.env.CF_PAGES === "1";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({ srcDirectory: "src" }),
    viteReact(),
    nitro(
      cloudflareBuild
        ? {
            cloudflare: {
              deployConfig: true,
              nodeCompat: true,
            },
            preset: "cloudflare-module",
          }
        : undefined
    ),
  ],
  resolve: {
    alias: {
      "@": reviewUiSrc,
      "~": path.join(root, "src"),
    },
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
});
