#!/usr/bin/env bun
/**
 * Regenerate docs/images for the README.
 * Usage: bun scripts/capture-readme-screenshots.ts
 */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium } from "playwright";

import { startReviewServer } from "../apps/cli/src/review-server.ts";
import { capture } from "../packages/core/src/capture.ts";
import { promoteActuals } from "../packages/core/src/images.ts";

const root = path.join(import.meta.dir, "..");
const outDir = path.join(root, "docs", "images");
const storybookPort = 6020;
const reviewPort = 4322;
const url = `http://127.0.0.1:${storybookPort}`;
const storyPath = path.join(root, "packages/fixture/stories/hero.stories.tsx");
const originalStory = await readFile(storyPath, "utf-8");

const storybook = Bun.spawn({
  cmd: [
    "bunx",
    "storybook",
    "dev",
    "-p",
    String(storybookPort),
    "--ci",
    "--exact-port",
    "--config-dir",
    "packages/fixture/.storybook",
    "--no-open",
  ],
  cwd: root,
  stderr: "pipe",
  stdout: "pipe",
});

async function waitForStorybook(): Promise<void> {
  const deadline = Date.now() + 90_000;
  let last = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("index.json", `${url}/`));

      if (response.ok) {
        return;
      }

      last = `${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }

    await Bun.sleep(500);
  }

  throw new Error(`storybook did not start: ${last}`);
}

async function initRepo(cwd: string): Promise<void> {
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

    if ((await proc.exited) !== 0) {
      throw new Error(await new Response(proc.stderr).text());
    }
  }
}

async function screenshotReview(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  cwd: string,
  filename: string,
  shotFilename: string,
  waitForDiff: boolean
): Promise<void> {
  const { stop, url: reviewUrl } = await startReviewServer({
    once: false,
    port: reviewPort,
    root: cwd,
  });

  try {
    const page = await browser.newPage({
      viewport: { height: 900, width: 1280 },
      colorScheme: "dark",
    });

    await page.goto(reviewUrl, { waitUntil: "networkidle" });

    const expandList = page.getByRole("button", {
      name: "Expand snapshot list",
    });

    if (await expandList.isVisible()) {
      await expandList.click();
    }

    await page
      .getByRole("button", { name: new RegExp(shotFilename) })
      .first()
      .click();

    await page.waitForSelector('img[alt="this scan"]', { timeout: 10_000 });

    if (waitForDiff) {
      await page.waitForSelector('img[alt="baseline"]', { timeout: 10_000 });
    }

    await page.screenshot({
      path: path.join(outDir, filename),
      fullPage: false,
    });
  } finally {
    stop();
    await Bun.sleep(200);
  }
}

const work = await mkdtemp(path.join(tmpdir(), "storybranch-readme-"));

try {
  await mkdir(outDir, { recursive: true });
  await waitForStorybook();
  await initRepo(work);

  const first = await capture(url, work);

  if (first.failures.length > 0) {
    console.log(first.failures.join("\n"));
  }

  const browser = await chromium.launch();

  await screenshotReview(
    browser,
    work,
    "review-missing-baselines.png",
    "narrow · chrome",
    false
  );

  await promoteActuals(work);

  const green = await capture(url, work);

  if (green.failures.length > 0) {
    throw new Error(green.failures.join("\n"));
  }

  await writeFile(
    storyPath,
    originalStory.replace("const revised = false;", "const revised = true;"),
    "utf-8"
  );
  await Bun.sleep(1500);

  const changed = await capture(url, work);

  if (changed.failures.length > 0) {
    console.log(changed.failures.join("\n"));
  }

  await screenshotReview(
    browser,
    work,
    "review-pixel-diff.png",
    "narrow · chrome",
    true
  );

  await browser.close();

  console.log(`Wrote screenshots to ${outDir}`);
} finally {
  await writeFile(storyPath, originalStory, "utf-8");
  storybook.kill();
}
