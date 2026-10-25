import { afterEach, describe, expect, test } from "bun:test";

import {
  demoReport,
  demoRunPayload,
  readDemoImage,
} from "~/lib/demo.server";
import { assertDemoRunId, DEMO_RUN_ID, demoEnabled } from "~/lib/demo.shared";

const previous = process.env.STORYBRANCH_DEMO_ENABLED;

afterEach(() => {
  if (previous === undefined) {
    delete process.env.STORYBRANCH_DEMO_ENABLED;
  } else {
    process.env.STORYBRANCH_DEMO_ENABLED = previous;
  }
});

describe("demo gating", () => {
  test("demo is off unless STORYBRANCH_DEMO_ENABLED=1", () => {
    delete process.env.STORYBRANCH_DEMO_ENABLED;
    expect(demoEnabled()).toBe(false);
    expect(demoEnabled({ STORYBRANCH_DEMO_ENABLED: "0" })).toBe(false);
    expect(demoEnabled({ STORYBRANCH_DEMO_ENABLED: "1" })).toBe(true);
  });

  test("assertDemoRunId rejects when demo is disabled", () => {
    delete process.env.STORYBRANCH_DEMO_ENABLED;

    try {
      assertDemoRunId(DEMO_RUN_ID);
      throw new Error("expected assertDemoRunId to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });
});

describe("demo bundle", () => {
  test("report matches fixture-aligned entries", () => {
    const report = demoReport();

    expect(report.entries.map((entry) => entry.filename)).toEqual([
      "hero--modes__narrow__chrome.png",
      "hero--default__1200x900__chrome.png",
      "hero--pinned__mobile1__chrome.png",
    ]);
  });

  test("payload uses the stable public run id", () => {
    expect(demoRunPayload().run.commitSha).toBe(demoReport().commit);
    expect(DEMO_RUN_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("readDemoImage", () => {
  test("serves bundled baseline png for a demo shot", async () => {
    const bytes = await readDemoImage(
      "baseline",
      "hero--default__1200x900__chrome.png"
    );

    expect(bytes).toBeDefined();
    expect(bytes?.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  });

  test("rejects unsafe filenames", async () => {
    expect(await readDemoImage("actual", "../escape.png")).toBeUndefined();
    expect(await readDemoImage("actual", "not-png")).toBeUndefined();
  });
});
