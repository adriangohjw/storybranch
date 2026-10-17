import antiSlop from "ultracite/oxlint/anti-slop";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";

const reactDoctor = selectJsPlugins(["react-doctor"]);

export const reactDoctorExtends = [reactDoctor];
export const reactDoctorJsPlugins = [...antiSlop.jsPlugins, ...reactDoctor.jsPlugins];
