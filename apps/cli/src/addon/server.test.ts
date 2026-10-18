import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { storybranchBin } from "@/addon/preset.ts";
import {
  addonReviewPort,
  createAddonApi,
  readReportFile,
  runStorybranch,
  storybookUrlFromPort,
} from "@/addon/server.ts";
import type { StoryVisualStatus } from "@/addon/status.ts";

const changed: StoryVisualStatus = {
  detail: "changed 1200x900 chrome",
  sidebar: "status-value:warning",
  status: "changed",
  storyId: "hero--default",
};

test("the dev server url uses the connected port", () => {
  expect(storybookUrlFromPort(4598, "http://127.0.0.1:1")).toBe(
    "http://127.0.0.1:4598"
  );
  expect(storybookUrlFromPort(undefined, "http://127.0.0.1:4598")).toBe(
    "http://127.0.0.1:4598"
  );
});

test("addon review port follows STORYBRANCH_PORT", () => {
  expect(addonReviewPort(undefined)).toBe(4321);
  expect(addonReviewPort("")).toBe(4321);
  expect(addonReviewPort("4400")).toBe(4400);
  expect(() => addonReviewPort("0")).toThrow("invalid STORYBRANCH_PORT");
});

test("preset bin sits next to the published package bin", () => {
  expect(storybranchBin("file:///app/dist/addon/preset.js")).toBe(
    "/app/bin/storybranch.js"
  );
});

test("get reads report.json and post keeps one run in flight", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-addon-"));
  await mkdir(path.join(root, ".storybranch"), { recursive: true });
  await writeFile(
    path.join(root, ".storybranch", "report.json"),
    JSON.stringify({
      entries: [
        {
          browser: "chrome",
          shotLabel: "1200x900",
          status: "new",
          storyId: "hero--default",
        },
      ],
    })
  );
  const first = await readReportFile(root);
  expect(first?.stories[0]?.status).toBe("new");

  let mtimeMs = 1;
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const api = createAddonApi({
    readReport: async () => {
      mtimeMs += 1;

      return { mtimeMs, stories: [changed] };
    },
    reviewPort: 4321,
    run: async ({ port, url }) => {
      expect(url).toBe("http://127.0.0.1:6006");
      expect(port).toBe(4321);
      await gate;

      return {
        code: 1,
        stderr: "",
        stdout: "storybranch review at http://127.0.0.1:4321\n",
      };
    },
    storybookUrl: () => "http://127.0.0.1:6006",
  });

  const running = api.handle("POST");
  const blocked = await api.handle("POST");
  expect(blocked.status).toBe(409);
  expect(blocked.body.running).toBe(true);
  release();
  const done = await running;
  expect(done.status).toBe(200);
  expect(done.body.running).toBe(false);
  expect(done.body.reviewUrl).toBe("http://127.0.0.1:4321");
  expect(done.body.stories).toEqual([changed]);
  expect(done.body.summary).toBe("1 story needs attention · 1 changed");
});

test("a run that does not rewrite the report is a failure", async () => {
  const api = createAddonApi({
    readReport: async () => ({ mtimeMs: 5, stories: [] }),
    reviewPort: 4321,
    run: async () => ({
      code: 1,
      stderr: "no Storybook package found\n",
      stdout: "",
    }),
    storybookUrl: () => "http://127.0.0.1:1",
  });
  const result = await api.handle("POST");

  expect(result.status).toBe(500);
  expect(result.body.error).toBe("no Storybook package found");
});

test("runStorybranch invokes the cli against the dev server", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-addon-bin-"));
  const bin = path.join(root, "fake.js");
  await writeFile(
    bin,
    "console.log(process.argv.slice(2).join(' '));\nconsole.log('storybranch review at http://127.0.0.1:4321');\n"
  );
  const result = await runStorybranch({
    bin,
    port: 4321,
    root,
    url: "http://127.0.0.1:5999",
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain(
    `test --url http://127.0.0.1:5999 --review --port 4321 --cwd ${root}`
  );
});
