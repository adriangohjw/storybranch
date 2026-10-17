import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  env: core.env,
  extends: [core, antiSlop],
  ignorePatterns: [...(core.ignorePatterns ?? []), "**/*.test.ts"],
  options: { typeAware: true },
  rules: {
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-use-before-define": "off",
  },
  settings: jsPluginSettings,
});
