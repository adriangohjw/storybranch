import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

const reactDoctor = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  env: core.env,
  extends: [core, react, antiSlop, reactDoctor],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "packages/storybranch/src/**/*.test.ts",
  ],
  jsPlugins: [...antiSlop.jsPlugins, ...reactDoctor.jsPlugins],
  options: { typeAware: true },
  overrides: [
    {
      excludeFiles: ["apps/review-ui/**"],
      files: ["packages/storybranch/src/**/*.{ts,tsx}"],
      rules: {
        // Ultracite core enables `no-restricted-imports` but leaves patterns to
        // the project. Prefer `@/` (see tsconfig paths) over `./` in the CLI package.
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["./*", "../*"],
                message: "Use the @/ path alias instead of a relative import.",
              },
            ],
          },
        ],
      },
    },
  ],
  rules: {
    // Shots run one at a time in one browser. Function declarations stay;
    // they are hoisted, and the preset's expression style fights that.
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-use-before-define": "off",
  },
  settings: jsPluginSettings,
});
