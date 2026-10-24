import { expect, test } from "bun:test";

import {
  acceptActualAsBaseline,
  actualKey,
  baselineKey,
  memoryStore,
  safeFilename,
} from "~/lib/keys";
import { canAdmin, canReview, isRole } from "~/lib/roles";

test("org roles gate accept and admin", () => {
  expect(canReview("member")).toBe(false);
  expect(canReview("approver")).toBe(true);
  expect(canAdmin("approver")).toBe(false);
  expect(canAdmin("admin")).toBe(true);
  expect(isRole("member")).toBe(true);
  expect(isRole("owner")).toBe(false);
});

test("accept copies the run actual onto the project baseline key", async () => {
  const store = memoryStore();
  const png = Buffer.from("actual-png");
  await store.put(
    actualKey("proj", "run", "hero--default__1200x900__chrome.png"),
    png
  );
  await acceptActualAsBaseline(
    store,
    "proj",
    "run",
    "hero--default__1200x900__chrome.png"
  );
  expect(
    await store.get(baselineKey("proj", "hero--default__1200x900__chrome.png"))
  ).toEqual(png);
});

test("snapshot filenames reject path traversal", () => {
  expect(safeFilename("hero--default__1200x900__chrome.png")).toBe(true);
  expect(safeFilename("../secret.png")).toBe(false);
});
