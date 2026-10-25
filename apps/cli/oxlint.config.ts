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
  overrides: [
    srcAliasImportsOverride,
    {
      files: ["src/hosted.ts"],
      rules: {
        "anti-slop/no-known-value-widening": "off",
        "anti-slop/no-runtime-typeof": "off",
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        "react-doctor/async-await-in-loop": "off",
        "react-doctor/server-sequential-independent-await": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "typescript/prefer-nullish-coalescing": "off",
        "typescript/strict-boolean-expressions": "off",
      },
    },
  ],
});
