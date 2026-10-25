import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site: "https://storybook.adriangohjw.com",
  env: {
    schema: {
      PUBLIC_STORYBRANCH_DEMO_URL: {
        context: "client",
        access: "public",
        optional: true,
        type: "string",
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
