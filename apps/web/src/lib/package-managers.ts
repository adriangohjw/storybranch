export type PackageManager = "bun" | "npm" | "pnpm";

export const PACKAGE_MANAGERS: PackageManager[] = ["npm", "pnpm", "bun"];

export const PACKAGE_MANAGER_LABEL: Record<PackageManager, string> = {
  bun: "bun",
  npm: "npm",
  pnpm: "pnpm",
};

const PACKAGE = "@adriangohjw/storybranch";
const STORYBOOK_URL = "http://127.0.0.1:6006";

export type InstallCommandKind =
  | "addPackage"
  | "installPlaywright"
  | "monorepoSetup"
  | "playwright"
  | "test";

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

    case "playwright": {
      if (pm === "npm") {
        return "npx playwright install chromium";
      }

      if (pm === "pnpm") {
        return "pnpm exec playwright install chromium";
      }

      return "bunx playwright install chromium";
    }

    case "test": {
      if (pm === "npm") {
        return `npx storybranch test --url ${STORYBOOK_URL}`;
      }

      if (pm === "pnpm") {
        return `pnpm exec storybranch test --url ${STORYBOOK_URL}`;
      }

      return `bunx storybranch test --url ${STORYBOOK_URL}`;
    }

    case "installPlaywright": {
      return `${installCommand("addPackage", pm)} && ${installCommand("playwright", pm)}`;
    }

    case "monorepoSetup": {
      if (pm === "npm") {
        return `git clone https://github.com/adriangohjw/storybranch.git && cd storybranch && npm install && npx playwright install chromium && npm run build`;
      }

      if (pm === "pnpm") {
        return `git clone https://github.com/adriangohjw/storybranch.git && cd storybranch && pnpm install && pnpm exec playwright install chromium && pnpm run build`;
      }

      return `git clone https://github.com/adriangohjw/storybranch.git && cd storybranch && bun install && bunx playwright install chromium && bun run build`;
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
