import { expect, test } from "bun:test";

import type { ReportEntry } from "@storybranch/report";

import { buildSnapshotTree } from "@/lib/snapshot-tree.ts";

test("buildSnapshotTree nests component, story, size, and browser", () => {
  const entries: ReportEntry[] = [
    {
      filename: "card--primary__1280.png",
      shotLabel: "1280",
      status: "new",
      storyId: "card--primary",
    },
    {
      filename: "card--primary__380.png",
      shotLabel: "380",
      status: "unchanged",
      storyId: "card--primary",
    },
    {
      filename: "card--secondary__1280.png",
      shotLabel: "1280",
      status: "changed",
      storyId: "card--secondary",
    },
  ];

  const tree = buildSnapshotTree(entries);

  expect(tree.components.map((node) => node.component)).toEqual(["card"]);
  expect(tree.components[0]?.stories.map((node) => node.story)).toEqual([
    "primary",
    "secondary",
  ]);
  expect(tree.components[0]?.hasAttention).toBe(true);
  expect(
    tree.components[0]?.stories[0]?.shots.map((shot) => shot.label)
  ).toEqual(["380", "1280"]);
  expect(tree.components[0]?.stories[0]?.shots[1]?.leaves[0]?.browser).toBe(
    "chromium"
  );
});

test("browser suffix on the filename becomes the leaf", () => {
  const tree = buildSnapshotTree([
    {
      browser: "firefox",
      filename: "card--primary__1280__firefox.png",
      shotLabel: "1280",
      status: "new",
      storyId: "card--primary",
    },
  ]);

  expect(tree.components[0]?.stories[0]?.shots[0]?.leaves[0]?.browser).toBe(
    "firefox"
  );
});
