import { expect, test } from "bun:test";

import { installCommand } from "@/lib/package-managers.ts";

test("npm is the default install wording", () => {
  expect(installCommand("addPackage", "npm")).toBe(
    "npm install -D @adriangohjw/storybranch"
  );
});

test("each package manager gets a matching script runner", () => {
  expect(installCommand("run", "npm")).toBe("npm run visual");
  expect(installCommand("run", "pnpm")).toBe("pnpm run visual");
  expect(installCommand("run", "bun")).toBe("bun run visual");
  expect(installCommand("storybookDev", "npm")).toBe(
    "npx storybook dev -p 6006"
  );
  expect(installCommand("storybookDev", "bun")).toBe(
    "bunx storybook dev -p 6006"
  );
});
