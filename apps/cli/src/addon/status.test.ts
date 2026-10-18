import { expect, test } from "bun:test";

import {
  failureLine,
  isReportDocument,
  reviewBuildError,
  reviewUrlFromOutput,
  storyStatuses,
  summary,
} from "@/addon/status.ts";

test("worst shot status wins and shots stay in report order", () => {
  expect(
    storyStatuses([
      {
        browser: "chrome",
        shotLabel: "1200x900",
        status: "unchanged",
        storyId: "b--one",
      },
      {
        browser: "firefox",
        shotLabel: "1200x900",
        status: "new",
        storyId: "b--one",
      },
      {
        browser: "chrome",
        shotLabel: "narrow",
        status: "changed",
        storyId: "a--two",
      },
      { browser: "chrome", status: "error", storyId: "a--two" },
      { status: "nope", storyId: "a--two" },
      { status: "stale", storyId: "" },
    ])
  ).toEqual([
    {
      detail: "changed narrow chrome; error chrome",
      sidebar: "status-value:error",
      status: "error",
      storyId: "a--two",
    },
    {
      detail: "unchanged 1200x900 chrome; new 1200x900 firefox",
      sidebar: "status-value:warning",
      status: "new",
      storyId: "b--one",
    },
  ]);
});

test("summary counts stories that need a baseline decision", () => {
  const stories = storyStatuses([
    { status: "new", storyId: "a--one" },
    { status: "changed", storyId: "b--two" },
    { status: "unchanged", storyId: "c--three" },
  ]);

  expect(summary(stories)).toBe("2 stories need attention · 1 new · 1 changed");
  expect(summary([])).toBe("No report yet");
  expect(
    summary(storyStatuses([{ status: "unchanged", storyId: "c--three" }]))
  ).toBe("All unchanged");
});

test("report json without entries is ignored", () => {
  expect(isReportDocument({ commit: "abc" })).toBe(false);
  const document = { entries: [{ status: "stale", storyId: "a--one" }] };
  expect(isReportDocument(document)).toBe(true);

  if (!isReportDocument(document)) {
    return;
  }

  expect(storyStatuses(document.entries)).toEqual([
    {
      detail: "stale",
      sidebar: "status-value:warning",
      status: "stale",
      storyId: "a--one",
    },
  ]);
});

test("review url and failure text come from the cli output", () => {
  expect(
    reviewUrlFromOutput("storybranch review at http://127.0.0.1:4321\n")
  ).toBe("http://127.0.0.1:4321");
  expect(reviewUrlFromOutput("ok")).toBeNull();
  expect(
    failureLine("first\n\u001B[33mmissing baseline shot.png\u001B[39m\n")
  ).toBe("missing baseline shot.png");
  expect(
    failureLine(
      "error: failed to launch chrome\nnote: missing sourcemaps\nBun v1.4.3 (Linux x64)\n"
    )
  ).toBe("error: failed to launch chrome");
  expect(reviewBuildError("review UI is not built; run bun run build")).toBe(
    "review UI is not built; run bun run build"
  );
});
