import { expect, test } from "bun:test";

import { detachedReviewCommand } from "@/review-spawn.ts";

test("detached review re-executes the current entry", () => {
  expect(detachedReviewCommand(4321, true)).toEqual([
    process.execPath,
    process.argv[1],
    "review",
    "--port",
    "4321",
    "--once",
  ]);
});
