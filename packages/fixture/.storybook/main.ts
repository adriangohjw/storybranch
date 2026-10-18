import type { StorybookConfig } from "@storybook/react-vite";

const errors = process.env.STORYBRANCH_FIXTURE === "errors";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [
    errors ? "../stories-errors/*.stories.tsx" : "../stories/*.stories.tsx",
  ],
  typescript: {
    reactDocgen: false,
  },
};

export default config;
