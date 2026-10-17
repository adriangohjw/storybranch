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
  jsPlugins: reactStackJsPlugins,
});
