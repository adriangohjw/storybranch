import base from "@storybranch/oxlint-config/base";
import { extendsList } from "@storybranch/oxlint-config/extends-list";
import {
  reactStackExtends,
  reactStackJsPlugins,
} from "@storybranch/oxlint-config/react-stack";
import { defineConfig } from "oxlint";

export default defineConfig({
  ...base,
  extends: [...extendsList(base), ...reactStackExtends],
  ignorePatterns: [
    ...(base.ignorePatterns ?? []),
    "src/routeTree.gen.ts",
    ".output/**",
  ],
  jsPlugins: reactStackJsPlugins,
  rules: {
    ...base.rules,
    "anti-slop/no-array-filter-map": "off",
    "anti-slop/no-known-value-widening": "off",
    "anti-slop/no-object-parameters": "off",
    "anti-slop/no-runtime-typeof": "off",
    "anti-slop/no-unknown-parameters": "off",
    "anti-slop/require-safety-comment-for-type-assertion": "off",
    "eslint/no-empty-function": "off",
    "eslint/no-nested-ternary": "off",
    "eslint/require-await": "off",
    "react-doctor/js-combine-iterations": "off",
    "react/function-component-definition": "off",
    "typescript/consistent-return": "off",
    "typescript/method-signature-style": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/only-throw-error": "off",
    "typescript/return-await": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/prefer-export-from": "off",
  },
});
