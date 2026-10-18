import { expect, test } from "bun:test";

import { installCommand } from "@/lib/package-managers.ts";

test("npm is the default install wording", () => {
  expect(installCommand("addPackage", "npm")).toBe(
    "npm install -D @adriangohjw/storybranch"
  );
});

test("each package manager gets matching playwright and test runners", () => {
  expect(installCommand("playwright", "pnpm")).toBe(
    "pnpm exec playwright install chromium"
  );
  expect(installCommand("test", "bun")).toBe(
    "bunx storybranch test --url http://127.0.0.1:6006"
  );
});
