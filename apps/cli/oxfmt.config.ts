import base from "@storybranch/oxfmt-config";
import { defineConfig } from "oxfmt";

export default defineConfig({
  ...base,
  ignorePatterns: ["review/public/**"],
});
