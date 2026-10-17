import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings } from "ultracite/oxlint/js-plugins";

export default defineConfig({
  env: core.env,
  extends: [core, antiSlop],
  ignorePatterns: core.ignorePatterns,
  options: { typeAware: true },
  settings: jsPluginSettings,
});
