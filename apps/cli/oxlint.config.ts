import base from "@storybranch/oxlint-config/base";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  ignorePatterns: [...(base.ignorePatterns ?? []), "review/**", "**/*.test.ts"],
});
