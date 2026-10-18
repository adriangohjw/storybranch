export type PackageManager = "bun" | "npm" | "pnpm";

export const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "bun"];

export const PACKAGE_MANAGER_LABEL: Record<PackageManager, string> = {
  bun: "bun",
  npm: "npm",
  pnpm: "pnpm",
};

const PACKAGE = "@adriangohjw/storybranch";

export type InstallCommandKind = "addPackage" | "run";

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
      if (pm === "npm") {
        return "npm run visual";
      }

      if (pm === "pnpm") {
        return "pnpm run visual";
      }

      return "bun run visual";
    }

    default: {
      return "";
    }
  }
}

export const PACKAGE_MANAGER_STORAGE_KEY = "storybranch-package-manager";

export function parsePackageManager(value: string | null): PackageManager {
  if (value === "bun" || value === "pnpm" || value === "npm") {
    return value;
  }

  return "npm";
}
