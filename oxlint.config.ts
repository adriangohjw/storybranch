import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

const reactDoctor = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  env: core.env,
  extends: [core, react, antiSlop, reactDoctor],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: [...antiSlop.jsPlugins, ...reactDoctor.jsPlugins],
  options: { typeAware: true },
  rules: {
    // Shots run one at a time in one browser. Function declarations stay;
    // they are hoisted, and the preset's expression style fights that.
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-use-before-define": "off",
  },
  settings: jsPluginSettings,
});
