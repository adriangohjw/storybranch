import { describe, expect, test } from "bun:test";

import type { ReportEntry } from "@storybranch/report";

import {
  countsMatch,
  previewProof,
  projectsFinding,
  runFinding,
  summarizeProof,
} from "~/lib/proof";

function entry(status: ReportEntry["status"], filename: string): ReportEntry {
  return { filename, status, storyId: filename };
}

describe("summarizeProof", () => {
  test("counts decisions from the report and the review map", () => {
    const summary = summarizeProof(
      [
        entry("unchanged", "a.png"),
        entry("changed", "b.png"),
        entry("new", "c.png"),
        entry("changed", "d.png"),
        entry("error", "e.png"),
        entry("stale", "f.png"),
      ],
      { "b.png": "accepted", "d.png": "changes_requested" }
    );

    expect(summary).toMatchObject({
      accepted: 1,
      changes: 1,
      clear: 1,
      error: 1,
      open: 2,
      total: 6,
      waiting: 3,
    });
    expect(summary.cells).toEqual([
      "clear",
      "accepted",
      "open",
      "changes",
      "error",
      "open",
    ]);
    expect(countsMatch(summary)).toBe(true);
  });

  test("preview keeps the totals and shortens the strip", () => {
    const summary = summarizeProof(
      [
        entry("new", "a.png"),
        entry("new", "b.png"),
        entry("unchanged", "c.png"),
      ],
      {}
    );
    const preview = previewProof(summary, 2);

    expect(preview.cells).toEqual(["open", "open"]);
    expect(preview.total).toBe(3);
    expect(preview.waiting).toBe(2);
    expect(countsMatch(preview)).toBe(true);
  });
});

describe("findings", () => {
  test("names the project with the most shots waiting", () => {
    expect(
      projectsFinding([
        { name: "docs", runCount: 4, waiting: 0 },
        { name: "checkout", runCount: 2, waiting: 5 },
        { name: "marketing-site", runCount: 1, waiting: 1 },
      ])
    ).toBe("checkout has 5 shots waiting, and 1 other project does too.");
  });

  test("says when nothing is waiting", () => {
    expect(projectsFinding([{ name: "docs", runCount: 2, waiting: 0 }])).toBe(
      "Every latest run is clear."
    );
    expect(projectsFinding([])).toBe(
      "A project collects CI proofs for one repo."
    );
  });

  test("run finding uses the latest summary", () => {
    const summary = summarizeProof(
      [entry("changed", "a.png"), entry("error", "b.png")],
      {}
    );

    expect(runFinding(summary, true)).toBe(
      "The latest run has 1 shot waiting and 1 capture error."
    );
    expect(runFinding(null, false)).toBe(
      "No runs yet. A project token lets CI post the first proof."
    );
  });
});
