import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  env: core.env,
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  options: { typeAware: true },
  rules: {
    // Shots run one at a time in one browser. Function declarations stay;
    // they are hoisted, and the preset's expression style fights that.
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-use-before-define": "off",
  },
});
