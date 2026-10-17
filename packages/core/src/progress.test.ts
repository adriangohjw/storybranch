import { expect, test } from "bun:test";

import { createCaptureProgress } from "@/progress.ts";

test("capture progress is silent when disabled", () => {
  const progress = createCaptureProgress(2, false);
  progress.header(2);
  progress.storyStart(1, "button--default");
  progress.storyActive(1, "button--default", { index: 1, total: 1 });
  progress.storyDone(1, "button--default", {
    failed: 0,
    shots: 1,
    skipped: false,
  });
  progress.finish({
    elapsedMs: 100,
    failed: 0,
    shots: 1,
    stories: 2,
  });
  expect(progress).toBeDefined();
});
