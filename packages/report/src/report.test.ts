import { expect, test } from "bun:test";

import {
  attentionSummary,
  browserFromFilename,
  needsAttention,
  shotFilename,
  shotLabelFromFilename,
  storyIdFromFilename,
  storyPartsFromId,
  terminalAttentionBlock,
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
  expect(shotFilename("button--default", "1200x900", "firefox")).toBe(filename);
  expect(storyIdFromFilename(filename)).toBe("button--default");
  expect(shotLabelFromFilename(filename)).toBe("1200x900");
  expect(browserFromFilename(filename)).toBe("firefox");
  expect(shotFilename("button--modes", "dark/mobile", "chrome")).toBe(
    "button--modes__dark_mobile__chrome.png"
  );
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
