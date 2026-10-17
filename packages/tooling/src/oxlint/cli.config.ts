import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";

const reactDoctor = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  env: core.env,
  extends: [core, antiSlop, reactDoctor],
  ignorePatterns: [...(core.ignorePatterns ?? []), "src/**/*.test.ts"],
  jsPlugins: [...antiSlop.jsPlugins, ...reactDoctor.jsPlugins],
  options: { typeAware: true },
  overrides: [
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
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
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-use-before-define": "off",
  },
  settings: jsPluginSettings,
});
