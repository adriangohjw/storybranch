import type { StorybookConfig } from "@storybook/react-vite";

const fixture = process.env.STORYBRANCH_FIXTURE;

let stories = "../stories/*.stories.tsx";

if (fixture === "errors") {
  stories = "../stories-errors/*.stories.tsx";
} else if (fixture === "smoke") {
  stories = "../stories-smoke/*.stories.tsx";
}

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [stories],
  typescript: {
    reactDocgen: false,
  },
};

export default config;
