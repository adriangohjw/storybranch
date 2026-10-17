import antiSlop from "ultracite/oxlint/anti-slop";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

const reactDoctor = selectJsPlugins(["react-doctor"]);

export const reactStackExtends = [react, reactDoctor];
export const reactStackJsPlugins = [...antiSlop.jsPlugins, ...reactDoctor.jsPlugins];
