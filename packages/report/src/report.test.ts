import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  acceptAllAttention,
  acceptEntry,
  attentionSummary,
  browserFromFilename,
  needsAttention,
  readReport,
  shotLabelFromFilename,
  storyIdFromFilename,
  storyPartsFromId,
  terminalAttentionBlock,
  writeReport,
} from "@/report.ts";
import type { Report } from "@/report.ts";

test("story parts split on first double dash", () => {
  expect(storyPartsFromId("button--default")).toEqual({
    component: "button",
    story: "default",
  });
  expect(storyPartsFromId("orphan")).toEqual({
    component: "orphan",
    story: "default",
  });
});

test("story id, label, and browser parse from filename", () => {
  const filename = "button--default__1200x900__firefox.png";
  expect(storyIdFromFilename(filename)).toBe("button--default");
  expect(shotLabelFromFilename(filename)).toBe("1200x900");
  expect(browserFromFilename(filename)).toBe("firefox");
  expect(browserFromFilename("button--modes__dark_mobile__edge.png")).toBe(
    "edge"
  );
});

test("needsAttention marks non-unchanged statuses", () => {
  expect(needsAttention("unchanged")).toBe(false);
  expect(needsAttention("changed")).toBe(true);
  expect(needsAttention("stale")).toBe(true);
});

test("attentionSummary formats status counts", () => {
  const report: Report = {
    actualDir: "/tmp/actual",
    commit: "abc",
    createdAt: new Date().toISOString(),
    entries: [
      {
        filename: "a.png",
        shotLabel: "x",
        status: "new",
        storyId: "a",
      },
      {
        filename: "b.png",
        shotLabel: "y",
        status: "changed",
        storyId: "b",
      },
      {
        filename: "c.png",
        shotLabel: "z",
        status: "unchanged",
        storyId: "c",
      },
    ],
    root: "/tmp",
  };

  expect(attentionSummary(report)).toBe(
    "2 snapshots need attention · 1 new · 1 changed"
  );
  expect(
    attentionSummary({ ...report, entries: [report.entries[2]!] })
  ).toBeNull();
});

test("terminalAttentionBlock lists each snapshot that needs attention", () => {
  const report: Report = {
    actualDir: "/tmp/actual",
    commit: "abc",
    createdAt: new Date().toISOString(),
    durationMs: 4200,
    entries: [
      {
        filename: "button--primary__1200x900__chrome.png",
        shotLabel: "1200x900",
        status: "new",
        storyId: "button--primary",
      },
      {
        filename: "button--hover__1200x900__chrome.png",
        shotLabel: "1200x900",
        status: "changed",
        storyId: "button--hover",
      },
      {
        filename: "button--disabled__1200x900__chrome.png",
        shotLabel: "1200x900",
        status: "changed",
        storyId: "button--disabled",
      },
      {
        filename: "button--quiet__1200x900__chrome.png",
        shotLabel: "1200x900",
        status: "unchanged",
        storyId: "button--quiet",
      },
    ],
    root: "/tmp",
  };

  expect(terminalAttentionBlock(report)).toEqual([
    "4 snapshots scanned · 4.2s build time",
    "3 snapshots need attention · 1 new · 2 changed",
    "-> new: button--primary__1200x900__chrome",
    "-> changed: button--hover__1200x900__chrome",
    "-> changed: button--disabled__1200x900__chrome",
  ]);
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
