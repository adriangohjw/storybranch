import { expect, test } from "bun:test";
import { cp, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { readReport } from "@storybranch/report";
import { chromium, firefox } from "playwright";
import type { Browser } from "playwright";
import { PNG } from "pngjs";

const root = path.join(import.meta.dir, "../../..");

const shots = [
  "coverage--blank__1200x900.png",
  "coverage--cropped__1200x900.png",
  "coverage--default__1200x900.png",
  "coverage--delayed__1200x900.png",
  "coverage--include-aa__1200x900.png",
  "coverage--manifest-only__1200x900.png",
  "coverage--mode-box__card.png",
  "coverage--mode-named__phone.png",
  "coverage--mode-several__dark.png",
  "coverage--mode-several__mid.png",
  "coverage--mode-several__narrow.png",
  "coverage--mode-several__wide.png",
  "coverage--mode-slash__dark_mobile.png",
  "coverage--mode-theme__dark.png",
  "coverage--mode-theme__light.png",
  "coverage--mode-width-only__half.png",
  "coverage--mode-widths__narrow.png",
  "coverage--mode-widths__wide.png",
  "coverage--pause-at-end__1200x900.png",
  "coverage--pause-at-start__1200x900.png",
  "coverage--pinned-desktop__desktop.png",
  "coverage--pinned-mobile-1__mobile1.png",
  "coverage--pinned-mobile-2__mobile2.png",
  "coverage--pinned-odd__odd.png",
  "coverage--pinned-rotated__mobile1.png",
  "coverage--pinned-tablet__tablet.png",
  "coverage--pinned-wide__wide.png",
  "coverage--threshold__1200x900.png",
  "coverage--type__1200x900.png",
  "coverage--uncropped__1200x900.png",
  "coverage--widths__1200.png",
  "coverage--widths__320.png",
  "hero--default__1200x900.png",
  "hero--modes__narrow.png",
  "hero--modes__wide.png",
  "hero--pinned__mobile1.png",
];

const e2eBrowsers = (
  process.env.STORYBRANCH_E2E_BROWSERS ?? "chrome,firefox,edge"
)
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name !== "" && name !== "skip");

const captured = e2eBrowsers
  .flatMap((browser) =>
    shots.map((name) => name.replace(/\.png$/u, `__${browser}.png`))
  )
  .toSorted();

const absent = [
  "coverage--disabled",
  "coverage--disabled-snapshot",
  "coverage--disabled-with-modes",
  "coverage--empty-modes",
  "coverage--empty-widths",
  "hero--skipped",
];

test.skipIf(process.env.STORYBRANCH_E2E_BROWSERS === "skip")(
  "fixture stories capture, approve, and match",
  async () => {
    const url = "http://127.0.0.1:6019";
    await withStorybook(6019, {}, async () => {
      const index = await readIndex(url);
      expect(story(index, "hero--skipped")?.tags ?? []).not.toContain("test");
      const tags = story(index, "coverage--default")?.tags ?? [];
      expect(tags).toContain("test");
      expect(tags).toContain("manifest");
      expect(story(index, "coverage--disabled")).toBeDefined();

      const work = await mkdtemp(path.join(tmpdir(), "storybranch-e2e-"));
      await storybookPackage(work);
      const hash = await initRepo(work);
      const first = await run(
        ["test", "--url", url, "--browsers", e2eBrowsers.join(",")],
        work
      );
      expect(first.exitCode).toBe(1);

      for (const line of failureLines(first.stderr)) {
        expect(line.startsWith("missing baseline ") ? true : line).toBe(true);
      }

      const approved = await run(["approve"], work);
      expect(approved.exitCode).toBe(0);

      const second = await run(
        ["test", "--url", url, "--browsers", e2eBrowsers.join(",")],
        work
      );
      expect(second.stderr).toBe("");
      expect(second.exitCode).toBe(0);

      const baselines = await readdir(
        path.join(work, ".storybranch", "baseline")
      );
      expect(baselines.toSorted()).toEqual(captured);

      for (const name of absent) {
        expect(baselines.some((file) => file.startsWith(name))).toBe(false);
      }

      const report = await readReport(work);
      expect(
        report.entries.every((entry) => entry.status === "unchanged")
      ).toBe(true);
      expect(report.commit).toBe(hash);

      if (!e2eBrowsers.includes("chrome")) {
        return;
      }

      await expectShot(work, hash, "coverage--default__1200x900__chrome.png", {
        color: [226, 232, 240],
        height: 900,
        width: 1200,
      });
      await expectShot(
        work,
        hash,
        "coverage--pinned-mobile-1__mobile1__chrome.png",
        {
          height: 568,
          width: 320,
        }
      );
      await expectShot(
        work,
        hash,
        "coverage--pinned-rotated__mobile1__chrome.png",
        {
          height: 320,
          width: 568,
        }
      );
      await expectShot(
        work,
        hash,
        "coverage--pinned-desktop__desktop__chrome.png",
        {
          height: 1024,
          width: 1280,
        }
      );
      await expectShot(
        work,
        hash,
        "coverage--pinned-mobile-2__mobile2__chrome.png",
        {
          height: 896,
          width: 414,
        }
      );
      await expectShot(
        work,
        hash,
        "coverage--pinned-tablet__tablet__chrome.png",
        {
          height: 1112,
          width: 834,
        }
      );
      await expectShot(work, hash, "coverage--pinned-wide__wide__chrome.png", {
        height: 700,
        width: 1440,
      });
      await expectShot(work, hash, "coverage--pinned-odd__odd__chrome.png", {
        height: 100,
        width: 321,
      });
      await expectShot(work, hash, "coverage--widths__320__chrome.png", {
        height: 900,
        width: 320,
      });
      await expectShot(work, hash, "coverage--widths__1200__chrome.png", {
        height: 900,
        width: 1200,
      });
      await expectShot(
        work,
        hash,
        "coverage--mode-widths__narrow__chrome.png",
        {
          height: 900,
          width: 320,
        }
      );
      await expectShot(work, hash, "coverage--mode-widths__wide__chrome.png", {
        height: 900,
        width: 800,
      });
      await expectShot(work, hash, "coverage--mode-theme__dark__chrome.png", {
        color: [17, 24, 39],
        height: 900,
        width: 1200,
      });
      await expectShot(work, hash, "coverage--mode-theme__light__chrome.png", {
        color: [226, 232, 240],
        height: 900,
        width: 1200,
      });
      await expectShot(work, hash, "coverage--mode-named__phone__chrome.png", {
        color: [17, 24, 39],
        height: 568,
        width: 320,
      });
      await expectShot(work, hash, "coverage--mode-box__card__chrome.png", {
        height: 200,
        width: 400,
      });
      await expectShot(
        work,
        hash,
        "coverage--mode-width-only__half__chrome.png",
        {
          height: 900,
          width: 500,
        }
      );
      await expectShot(
        work,
        hash,
        "coverage--mode-slash__dark_mobile__chrome.png",
        {
          color: [17, 24, 39],
          height: 900,
          width: 360,
        }
      );
      await expectShot(work, hash, "coverage--mode-several__mid__chrome.png", {
        height: 900,
        width: 640,
      });
      await expectShot(work, hash, "coverage--delayed__1200x900__chrome.png", {
        color: [0, 0, 255],
        height: 900,
        width: 1200,
      });
      await expectShot(
        work,
        hash,
        "coverage--pause-at-end__1200x900__chrome.png",
        {
          color: [255, 0, 0],
          height: 900,
          width: 1200,
        }
      );
      await expectShot(
        work,
        hash,
        "coverage--pause-at-start__1200x900__chrome.png",
        {
          color: [0, 255, 0],
          height: 900,
          width: 1200,
        }
      );
      await expectShot(work, hash, "coverage--cropped__1200x900__chrome.png", {
        color: [18, 52, 86],
        height: 900,
        width: 1200,
      });
      await expectShot(
        work,
        hash,
        "coverage--uncropped__1200x900__chrome.png",
        {
          color: [18, 52, 86],
          height: 2000,
          width: 2000,
        }
      );
      await expectShot(work, hash, "coverage--blank__1200x900__chrome.png", {
        color: [255, 255, 255],
        height: 4,
        width: 4,
      });
      await expectShot(work, hash, "hero--default__1200x900__chrome.png", {});
    });

    const errorUrl = "http://127.0.0.1:6021";
    await withStorybook(6021, { STORYBRANCH_FIXTURE: "errors" }, async () => {
      const work = await mkdtemp(path.join(tmpdir(), "storybranch-e2e-"));
      await storybookPackage(work);
      await initRepo(work);
      const result = await run(
        ["test", "--url", errorUrl, "--browsers", e2eBrowsers.join(",")],
        work
      );
      expect(result.exitCode).toBe(1);
      const stderr = result.stderr;
      expect(stderr).toContain(
        "chromatic.modes and chromatic.viewports are both set"
      );
      expect(stderr).toContain("unknown viewport nope");
      expect(stderr).toContain("invalid viewport for mode bad");
      expect(stderr).toContain("viewport broken width is not px");
      expect(stderr).toContain("errors--throws");
      expect(stderr).toContain("storybook-root");
      expect(stderr).toContain("screenshot did not stabilize");
    });
  },
  { timeout: 480_000 }
);

interface IndexEntry {
  id?: string;
  tags?: string[];
  type: string;
}

async function readIndex(storybookUrl: string): Promise<IndexEntry[]> {
  const response = await fetch(new URL("index.json", `${storybookUrl}/`));
  const body: unknown = await response.json();

  if (typeof body !== "object" || body === null || !("entries" in body)) {
    throw new Error("index.json missing entries");
  }

  const { entries } = body;

  if (typeof entries !== "object" || entries === null) {
    throw new Error("index.json entries were not an object");
  }

  return Object.values(entries).filter(isIndexEntry);
}

function isIndexEntry(value: unknown): value is IndexEntry {
  return typeof value === "object" && value !== null && "type" in value;
}

function story(entries: IndexEntry[], id: string): IndexEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

async function expectShot(
  work: string,
  hash: string,
  filename: string,
  expected: { width?: number; height?: number; color?: number[] }
): Promise<void> {
  const bytes = await Bun.file(
    path.join(work, ".storybranch", "actual", hash, filename)
  ).bytes();
  const png = PNG.sync.read(Buffer.from(bytes));

  if (expected.width !== undefined) {
    expect(png.width).toBe(expected.width);
  }

  if (expected.height !== undefined) {
    expect(png.height).toBe(expected.height);
  }

  const [red, green, blue] = expected.color ?? [];

  if (red === undefined || green === undefined || blue === undefined) {
    return;
  }

  const x = Math.floor(png.width / 2);
  const y = Math.floor(png.height / 2);
  const i = (y * png.width + x) * 4;
  const actual = [png.data[i], png.data[i + 1], png.data[i + 2]];

  for (const [index, channel] of [red, green, blue].entries()) {
    expect(Math.abs((actual[index] ?? 0) - channel)).toBeLessThanOrEqual(8);
  }
}

function failureLines(stderr: string): string[] {
  return stderr.split("\n").filter((line) => {
    return line.length > 0 && !line.includes("review UI is not built");
  });
}

async function withStorybook(
  port: number,
  env: Record<string, string>,
  runTest: () => Promise<void>
): Promise<void> {
  const storybook = Bun.spawn({
    cmd: [
      "bunx",
      "storybook",
      "dev",
      "-p",
      String(port),
      "--ci",
      "--exact-port",
      "--config-dir",
      "packages/fixture/.storybook",
      "--no-open",
    ],
    cwd: root,
    env: { ...process.env, ...env },
    stderr: "pipe",
    stdout: "pipe",
  });

  const logs: Uint8Array[] = [];

  const collect = async (stream: ReadableStream<Uint8Array> | null) => {
    if (!stream) {
      return;
    }

    for await (const chunk of stream) {
      logs.push(chunk);
    }
  };

  const logging = Promise.all([
    collect(storybook.stdout),
    collect(storybook.stderr),
  ]);

  try {
    const url = `http://127.0.0.1:${port}`;
    await waitForIndex(url);
    await warmPreview(url);
    await runTest();
  } catch (error) {
    const text = Buffer.concat(logs).toString();
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n${text}`,
      { cause: error }
    );
  } finally {
    storybook.kill();
    await logging.catch(() => {});
  }
}

async function launchE2eBrowser(): Promise<Browser> {
  const name = e2eBrowsers[0] ?? "chrome";

  if (name === "firefox") {
    return await firefox.launch();
  }

  if (name === "edge") {
    return await chromium.launch({ channel: "msedge" });
  }

  return await chromium.launch();
}

async function warmPreview(storybookUrl: string): Promise<void> {
  const entries = await readIndex(storybookUrl);
  const id = entries.find((entry) => entry.type === "story")?.id;

  if (id === undefined) {
    return;
  }

  const browser = await launchE2eBrowser();

  try {
    const page = await browser.newPage();
    const iframe = `${storybookUrl}/iframe.html?id=${id}&viewMode=story`;
    const deadline = Date.now() + 20_000;
    let last = "";

    while (Date.now() < deadline) {
      try {
        await page.goto(iframe, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("#storybook-root", { timeout: 2000 });
        return;
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
        await Bun.sleep(200);
      }
    }

    throw new Error(`preview did not warm: ${last}`);
  } finally {
    await browser.close();
  }
}

async function storybookPackage(work: string): Promise<void> {
  await cp(
    path.join(root, "packages/fixture/.storybook"),
    path.join(work, ".storybook"),
    { recursive: true }
  );
  await writeFile(
    path.join(work, "package.json"),
    `${JSON.stringify({ name: "storybranch-e2e", private: true })}\n`
  );
}

async function initRepo(cwd: string): Promise<string> {
  for (const cmd of [
    ["git", "init"],
    [
      "git",
      "-c",
      "user.email=storybranch@example.com",
      "-c",
      "user.name=storybranch",
      "commit",
      "--allow-empty",
      "-m",
      "init",
    ],
  ]) {
    const proc = Bun.spawn(cmd, { cwd, stderr: "pipe", stdout: "ignore" });
    const stderr = await new Response(proc.stderr).text();

    if ((await proc.exited) !== 0) {
      throw new Error(stderr.trim() || cmd.join(" "));
    }
  }

  const proc = Bun.spawn(["git", "-C", cwd, "rev-parse", "HEAD"], {
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(stderr.trim() || "git rev-parse HEAD failed");
  }

  return stdout.trim();
}

async function waitForIndex(storybookUrl: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let last = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("index.json", `${storybookUrl}/`));

      if (response.ok) {
        return;
      }

      last = `${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }

    await Bun.sleep(500);
  }

  throw new Error(`storybook did not serve index.json: ${last}`);
}

async function run(
  args: string[],
  cwd: string
): Promise<{ exitCode: number; stderr: string }> {
  const proc = Bun.spawn({
    cmd: ["bun", path.join(root, "apps/cli/src/cli.ts"), ...args],
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(`cli exited ${exitCode}\n${stdout}\n${stderr}`);
  }

  return { exitCode, stderr };
}
