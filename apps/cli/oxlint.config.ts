import base from "@storybranch/oxlint-config/base";
import { extendsList } from "@storybranch/oxlint-config/extends-list";
import {
  reactDoctorExtends,
  reactDoctorJsPlugins,
} from "@storybranch/oxlint-config/react-doctor";
import { srcAliasImportsOverride } from "@storybranch/oxlint-config/src-alias-imports";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  extends: [...extendsList(base), ...reactDoctorExtends],
  ignorePatterns: [
    ...(base.ignorePatterns ?? []),
    "bin/**",
    "dist/**",
    "review/**",
    "scripts/**",
  ],
  jsPlugins: reactDoctorJsPlugins,
  overrides: [srcAliasImportsOverride],
});
