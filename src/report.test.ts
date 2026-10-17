import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  acceptAllAttention,
  acceptEntry,
  needsAttention,
  readReport,
  shotLabelFromFilename,
  storyIdFromFilename,
  writeReport,
} from "@/report.ts";
import type { Report } from "@/report.ts";

test("story id and label parse from filename", () => {
  expect(storyIdFromFilename("button--default__1200x900.png")).toBe(
    "button--default"
  );
  expect(shotLabelFromFilename("button--default__1200x900.png")).toBe(
    "1200x900"
  );
});

test("needsAttention marks non-unchanged statuses", () => {
  expect(needsAttention("unchanged")).toBe(false);
  expect(needsAttention("changed")).toBe(true);
  expect(needsAttention("stale")).toBe(true);
});

test("acceptEntry promotes actual and clears attention", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-report-"));
  const actualDir = path.join(root, ".storybranch", "actual", "abc");
  const baselineDir = path.join(root, ".storybranch", "baseline");
  const filename = "story__shot.png";
  const png = Buffer.from([137, 80, 78, 71]);
  await mkdir(actualDir, { recursive: true });
  await Bun.write(path.join(actualDir, filename), png);

  const report: Report = {
    actualDir,
    commit: "abc",
    createdAt: new Date().toISOString(),
    entries: [
      {
        actualPath: path.join(actualDir, filename),
        filename,
        shotLabel: "shot",
        status: "new",
        storyId: "story",
      },
    ],
    root,
  };

  await writeReport(root, report);
  const updated = await acceptEntry(root, filename);
  expect(updated.entries[0]?.status).toBe("unchanged");
  expect(await Bun.file(path.join(baselineDir, filename)).exists()).toBe(true);
});

test("acceptAllAttention skips errors", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-report-"));

  const report: Report = {
    actualDir: path.join(root, ".storybranch", "actual", "abc"),
    commit: "abc",
    createdAt: new Date().toISOString(),
    entries: [
      {
        message: "boom",
        status: "error",
        storyId: "broken",
      },
    ],
    root,
  };

  await writeReport(root, report);
  const updated = await acceptAllAttention(root);
  expect(updated.entries[0]?.status).toBe("error");
  expect(await readReport(root)).toEqual(updated);
});
