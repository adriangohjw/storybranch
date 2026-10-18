import { expect, test } from "bun:test";

import { createCaptureProgress } from "@/progress.ts";

test("disabled capture progress writes nothing", () => {
  const writes: string[] = [];
  const original = process.stderr.write.bind(process.stderr);

  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    writes.push(String(chunk));

    return true;
  }) as typeof process.stderr.write;

  try {
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
  } finally {
    process.stderr.write = original;
  }

  expect(writes).toEqual([]);
});
