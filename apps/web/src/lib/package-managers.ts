export type PackageManager = "bun" | "npm" | "pnpm";

export const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "bun"];

export const PACKAGE_MANAGER_LABEL: Record<PackageManager, string> = {
  bun: "bun",
  npm: "npm",
  pnpm: "pnpm",
};

const PACKAGE = "@adriangohjw/storybranch";

export type PackageScript =
  | "visual"
  | "visual:review"
  | "visual:approve";

export type InstallCommandKind =
  | "addPackage"
  | "run"
  | "runApprove"
  | "runReview"
  | "storybookDev";

export function runPackageScript(
  script: PackageScript,
  pm: PackageManager
): string {
  if (pm === "npm") {
    return `npm run ${script}`;
  }

  if (pm === "pnpm") {
    return `pnpm run ${script}`;
  }

  return `bun run ${script}`;
}

export function installCommand(
  kind: InstallCommandKind,
  pm: PackageManager
): string {
  switch (kind) {
    case "addPackage": {
      if (pm === "npm") {
        return `npm install -D ${PACKAGE}`;
      }

      if (pm === "pnpm") {
        return `pnpm add -D ${PACKAGE}`;
      }

      return `bun add -d ${PACKAGE}`;
    }

    case "run": {
      return runPackageScript("visual", pm);
    }

    case "runReview": {
      return runPackageScript("visual:review", pm);
    }

    case "runApprove": {
      return runPackageScript("visual:approve", pm);
    }

    case "storybookDev": {
      if (pm === "npm") {
        return "npx storybook dev -p 6006";
      }

      if (pm === "pnpm") {
        return "pnpm exec storybook dev -p 6006";
      }

      return "bunx storybook dev -p 6006";
    }

    default: {
      return "";
    }
  }
}

export function agentsMarkdown(pm: PackageManager): string {
  const run = runPackageScript("visual", pm);
  const approve = runPackageScript("visual:approve", pm);

  return `## storybranch

\`@adriangohjw/storybranch\` is a dev dependency. Storybook must already be running at your \`--url\`. Run \`${run}\`.

- \`visual\` runs \`storybranch test --url <storybook>\`. Exit 1 means a visual diff. Lines: \`missing baseline\`, \`pixels\`, \`size\`, \`stale\`. A clean run prints \`ok\`.
- Read \`.storybranch/report.json\` (\`new\`, \`changed\`, \`unchanged\`, \`stale\`, \`error\`).
- The first run is \`missing baseline\` for every shot.
- Commit only \`.storybranch/baseline/\`. Ignore \`actual/\`, \`diff/\`, and \`report.json\`.
- Run \`${approve}\` only when asked to accept the shots. \`visual:review\` and \`--open\` are for a person.`;
}

export const PACKAGE_MANAGER_STORAGE_KEY = "storybranch-package-manager";

export function parsePackageManager(value: string | null): PackageManager {
  if (value === "bun" || value === "pnpm" || value === "npm") {
    return value;
  }

  return "npm";
}
