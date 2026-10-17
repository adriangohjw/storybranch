import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site: "https://storybranch.pages.dev",
  vite: {
    plugins: [tailwindcss()],
  },
});
