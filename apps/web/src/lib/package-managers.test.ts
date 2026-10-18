import { expect, test } from "bun:test";

import { installCommand } from "@/lib/package-managers.ts";

test("npm is the default install wording", () => {
  expect(installCommand("addPackage", "npm")).toBe(
    "npm install -D @adriangohjw/storybranch"
  );
});

test("each package manager gets matching playwright and script runners", () => {
  expect(installCommand("playwright", "pnpm")).toBe(
    "pnpm exec playwright install chromium"
  );
  expect(installCommand("run", "npm")).toBe("npm run visual");
  expect(installCommand("run", "bun")).toBe("bun run visual");
});
