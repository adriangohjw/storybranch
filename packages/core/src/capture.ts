import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import {
  browserFromFilename,
  shotFilename,
  shotLabelFromFilename,
  storyIdFromFilename,
  writeReport,
} from "@storybranch/report";
import type { Report, ReportEntry } from "@storybranch/report";
import { chromium, firefox, webkit } from "playwright";
import type { Browser, Page } from "playwright";

import { pickStories } from "@/chromatic.ts";
import type { OnlyChangedFilter } from "@/chromatic.ts";
import { installHint } from "@/config.ts";
import type { BrowserName } from "@/config.ts";
import { collectIgnoreRects } from "@/ignore.ts";
import { actualDirectory, comparePng } from "@/images.ts";
import type { IgnoreRect } from "@/images.ts";
import { isCapturable, planShots } from "@/plan.ts";
import type { PlanInput, Shot, ShotGlobals } from "@/plan.ts";
import type { CaptureProgress } from "@/progress.ts";
import { captureProgressEnabled, createCaptureProgress } from "@/progress.ts";

interface IndexEntry {
  id?: string;
  importPath?: string;
  type: string;
  tags?: string[];
}

const STORY_TIMEOUT_MS = 15_000;
const STABLE_FRAMES = 25;

function isStoryIndex(
  value: unknown
): value is { entries: Record<string, IndexEntry> } {
  if (typeof value !== "object" || value === null || !("entries" in value)) {
    return false;
  }

  return typeof value.entries === "object" && value.entries !== null;
}

export interface CaptureOptions {
  browsers?: BrowserName[];
  onlyChanged?: OnlyChangedFilter;
  parallelBrowsers?: boolean;
  progress?: boolean;
}

export interface CaptureResult {
  failures: string[];
  report: Report;
  wroteReport: boolean;
}

export async function capture(
  storybookUrl: string,
  root: string,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const base = storybookBase(storybookUrl);
  const indexUrl = new URL("index.json", base);
  const response = await fetch(indexUrl);

  if (!response.ok) {
    const failures = [
      `index.json returned ${response.status} from ${indexUrl}`,
    ];

    return { failures, report: emptyReport(root, "", ""), wroteReport: false };
  }

  const body: unknown = await response.json();

  if (!isStoryIndex(body)) {
    const failures = [`index.json from ${indexUrl} was not a story index`];

    return { failures, report: emptyReport(root, "", ""), wroteReport: false };
  }

  const stories: (IndexEntry & { id: string })[] = [];

  for (const [key, entry] of Object.entries(body.entries)) {
    const story = { ...entry, id: entry.id ?? key };

    if (isCapturable(story)) {
      stories.push(story);
    }
  }

  stories.sort((a, b) => a.id.localeCompare(b.id));

  // ponytail: partial runs skip stale baselines. A full run still catches removed stories.
  let partial = false;

  if (options.onlyChanged !== undefined) {
    const picked = pickStories(stories, options.onlyChanged);
    partial = !picked.full;
    stories.splice(0, stories.length, ...picked.stories);
  }

  const actualDir = await actualDirectory(root);
  const commit = path.basename(actualDir);
  const diffDir = path.join(root, ".storybranch", "diff");
  const baselineDir = path.join(root, ".storybranch", "baseline");
  await mkdir(actualDir, { recursive: true });
  await mkdir(diffDir, { recursive: true });

  const failures: string[] = [];
  const entries: ReportEntry[] = [];
  const expected = new Set<string>();
  const progressEnabled = options.progress ?? captureProgressEnabled();

  const progress: CaptureProgress = createCaptureProgress(
    stories.length,
    progressEnabled
  );

  const started = Date.now();
  let shotsCaptured = 0;
  const browsers = options.browsers ?? ["chrome"];
  progress.header(stories.length);

  const runBrowser = async (browserName: BrowserName): Promise<void> => {
    const browser = await launchBrowser(browserName);

    try {
      const context = await browser.newContext({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: 1200 },
      });

      const page = await context.newPage();
      await page.addInitScript(installStoryHook);

      const media: MediaEmulation = {
        forcedColors: null,
        media: null,
        reducedMotion: null,
      };

      for (const [index, story] of stories.entries()) {
        const current = index + 1;
        const iframe = new URL("iframe.html", base);
        iframe.searchParams.set("id", story.id);
        iframe.searchParams.set("viewMode", "story");

        const progressId =
          browsers.length > 1 ? `${browserName} ${story.id}` : story.id;

        let storyStats = { failed: 0, shots: 0, skipped: true };
        progress.storyStart(current, progressId);

        try {
          storyStats = await shootStory(
            page,
            iframe.toString(),
            story.id,
            current,
            browserName,
            progressId,
            actualDir,
            diffDir,
            baselineDir,
            expected,
            failures,
            entries,
            progress,
            media
          );
          shotsCaptured += storyStats.shots;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          failures.push(`${story.id} ${message}`);
          entries.push({
            browser: browserName,
            message,
            status: "error",
            storyId: story.id,
          });

          storyStats = { failed: 1, shots: 0, skipped: false };
        }

        progress.storyDone(current, progressId, storyStats);
      }
    } finally {
      await browser.close();
    }
  };

  // ponytail: parallel shares one progress spinner; per-browser lines if that gets unreadable
  if (options.parallelBrowsers === true && browsers.length > 1) {
    await Promise.all(
      browsers.map(async (browserName) => {
        await runBrowser(browserName);
      })
    );
  } else {
    for (const browserName of browsers) {
      await runBrowser(browserName);
    }
  }

  progress.finish({
    elapsedMs: Date.now() - started,
    failed: failures.length,
    shots: shotsCaptured,
    stories: stories.length,
  });

  let baselines: string[] = [];

  try {
    const baselineNames = await readdir(baselineDir);
    baselines = baselineNames.filter((file) => file.endsWith(".png"));
  } catch {
    baselines = [];
  }

  for (const baselineFile of partial
    ? []
    : baselines.filter((entry) => !expected.has(entry)).toSorted()) {
    failures.push(`stale ${baselineFile}`);
    entries.push({
      baselinePath: path.join(baselineDir, baselineFile),
      browser: browserFromFilename(baselineFile),
      filename: baselineFile,
      shotLabel: shotLabelFromFilename(baselineFile),
      status: "stale",
      storyId: storyIdFromFilename(baselineFile),
    });
  }

  const report: Report = {
    actualDir,
    commit,
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    entries: entries.toSorted((a, b) => entryKey(a).localeCompare(entryKey(b))),
    root,
    storyCount: stories.length,
  };

  await writeReport(root, report);

  return { failures, report, wroteReport: true };
}

function emptyReport(root: string, commit: string, actualDir: string): Report {
  return {
    actualDir,
    commit,
    createdAt: new Date().toISOString(),
    durationMs: 0,
    entries: [],
    root,
    storyCount: 0,
  };
}

function entryKey(entry: ReportEntry): string {
  if (entry.filename !== undefined) {
    return entry.filename;
  }

  return entry.storyId;
}

async function launchBrowser(browserName: BrowserName): Promise<Browser> {
  try {
    if (browserName === "firefox") {
      return await firefox.launch();
    }

    if (browserName === "edge") {
      return await chromium.launch({ channel: "msedge" });
    }

    if (browserName === "safari") {
      return await webkit.launch();
    }

    return await chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `failed to launch ${browserName}; ${installHint(browserName)} (${message})`,
      { cause: error }
    );
  }
}

async function shootStory(
  page: Page,
  iframeUrl: string,
  storyId: string,
  storyIndex: number,
  browserName: BrowserName,
  progressId: string,
  actualDir: string,
  diffDir: string,
  baselineDir: string,
  expected: Set<string>,
  failures: string[],
  entries: ReportEntry[],
  progress: CaptureProgress,
  media: MediaEmulation
): Promise<{ shots: number; failed: number; skipped: boolean }> {
  await page.setViewportSize({ height: 900, width: 1200 });
  await page.goto(iframeUrl, { waitUntil: "load" });
  progress.storyActive(storyIndex, progressId, null);
  await waitForStory(page);
  const input = await page.evaluate(readPlanInput, storyId);
  const plan = planShots(input);

  if ("skip" in plan) {
    return { failed: 0, shots: 0, skipped: true };
  }

  if ("error" in plan) {
    failures.push(`${storyId} ${plan.error}`);
    entries.push({
      browser: browserName,
      message: plan.error,
      status: "error",
      storyId,
    });

    return { failed: 1, shots: 0, skipped: false };
  }

  let shotFailures = 0;
  const [first] = plan.shots;

  if (first !== undefined) {
    const nextMedia = mediaOf(first);

    if (!sameMedia(media, nextMedia)) {
      await page.emulateMedia({
        forcedColors: nextMedia.forcedColors,
        media: nextMedia.media,
        reducedMotion: nextMedia.reducedMotion,
      });
      media.forcedColors = nextMedia.forcedColors;
      media.media = nextMedia.media;
      media.reducedMotion = nextMedia.reducedMotion;
      await page.goto(iframeUrl, { waitUntil: "load" });
      await waitForStory(page);
    }
  }

  for (const [shotIndex, shot] of plan.shots.entries()) {
    progress.storyActive(storyIndex, progressId, {
      index: shotIndex + 1,
      total: plan.shots.length,
    });
    const filename = shotFilename(storyId, shot.label, browserName);
    expected.add(filename);
    await page.setViewportSize({ height: shot.height, width: shot.width });

    if (Object.keys(shot.globals).length > 0) {
      // @ts-expect-error Playwright's Serialize<> cannot express recursive ShotGlobals.
      await page.evaluate(applyGlobals, shot.globals);
      await waitForStory(page);
    }

    if (shot.delay > 0) {
      await page.waitForTimeout(shot.delay);
    }

    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.evaluate(pauseAnimations, shot.pauseAtEnd);
    const { ignore, png } = await stablePng(page, shot);
    const actualPath = path.join(actualDir, filename);
    await Bun.write(actualPath, png);

    const baselinePath = path.join(baselineDir, filename);
    const baseline = Bun.file(baselinePath);
    const shotLabel = shot.label;

    if (!(await baseline.exists())) {
      failures.push(`missing baseline ${filename}`);
      entries.push({
        actualPath,
        browser: browserName,
        filename,
        shotLabel,
        status: "new",
        storyId,
      });
      shotFailures += 1;
      continue;
    }

    const result = comparePng(Buffer.from(await baseline.bytes()), png, {
      ignore,
      includeAA: shot.includeAA,
      threshold: shot.threshold,
    });

    if (result.match) {
      entries.push({
        actualPath,
        baselinePath,
        browser: browserName,
        filename,
        shotLabel,
        status: "unchanged",
        storyId,
      });
      continue;
    }

    let diffPath: string | undefined;

    if (result.reason === "pixels") {
      diffPath = path.join(diffDir, filename);
      await Bun.write(diffPath, result.diff);
    }

    failures.push(`${result.reason} ${filename}`);
    entries.push({
      actualPath,
      baselinePath,
      browser: browserName,
      diffPath,
      filename,
      message: result.reason === "size" ? "size mismatch" : undefined,
      shotLabel,
      status: "changed",
      storyId,
    });
    shotFailures += 1;
  }

  return {
    failed: shotFailures,
    shots: plan.shots.length,
    skipped: false,
  };
}

async function waitForStory(page: Page): Promise<void> {
  await page.waitForSelector("#storybook-root");

  try {
    await page.waitForFunction(
      () => globalThis.__storyStatus !== undefined,
      null,
      {
        timeout: STORY_TIMEOUT_MS,
      }
    );
  } catch {
    const hooked = await page.evaluate(hookChannel);

    if (!hooked) {
      throw new Error("story did not finish");
    }

    await page.waitForFunction(
      () => globalThis.__storyStatus !== undefined,
      null,
      {
        timeout: STORY_TIMEOUT_MS,
      }
    );
  }

  const status = await page.evaluate(() => globalThis.__storyStatus);

  if (status !== "success") {
    throw new Error(`story finished with ${status ?? "no status"}`);
  }
}

async function stablePng(
  page: Page,
  shot: Shot
): Promise<{ png: Buffer; ignore: IgnoreRect[] }> {
  const root = page.locator("#storybook-root");
  let previous: Buffer | null = null;
  let ignore: IgnoreRect[] = [];

  for (let attempt = 0; attempt < STABLE_FRAMES; attempt += 1) {
    ignore = await page.evaluate(collectIgnoreRects, shot.ignoreSelectors);
    const png = await takePng(page, root, shot);

    if (previous !== null && previous.equals(png)) {
      return { ignore, png };
    }

    previous = png;
    await page.waitForTimeout(50);
  }

  throw new Error(`screenshot did not stabilize for ${shot.label}`);
}

async function takePng(
  page: Page,
  root: ReturnType<Page["locator"]>,
  shot: Shot
): Promise<Buffer> {
  if (!shot.cropToViewport) {
    return await root.screenshot();
  }

  const box = await root.boundingBox();

  if (!box) {
    throw new Error("missing #storybook-root");
  }

  return await page.screenshot({
    clip: {
      height: Math.min(box.height, shot.height),
      width: Math.min(box.width, shot.width),
      x: box.x,
      y: box.y,
    },
  });
}

function storybookBase(input: string): URL {
  const base = new URL(input);

  if (!base.pathname.endsWith("/")) {
    base.pathname += "/";
  }

  return base;
}

function installStoryHook(): void {
  const hook = (preview: StoryPreview) => {
    preview.channel?.on("storyFinished", (payload) => {
      globalThis.__storyStatus = payload.status;
    });
  };

  let preview: StoryPreview | undefined;
  Object.defineProperty(globalThis, "__STORYBOOK_PREVIEW__", {
    configurable: true,
    get: () => preview,
    set: (value: StoryPreview) => {
      preview = value;
      hook(value);
    },
  });
}

function hookChannel(): boolean {
  const preview = globalThis.__STORYBOOK_PREVIEW__;

  if (!preview?.channel) {
    return false;
  }

  preview.channel.on("storyFinished", (payload) => {
    globalThis.__storyStatus = payload.status;
  });

  return true;
}

async function readPlanInput(storyId: string): Promise<PlanInput> {
  const preview = globalThis.__STORYBOOK_PREVIEW__;

  if (!preview) {
    throw new Error("Storybook preview is missing");
  }

  await preview.ready?.();
  const story = await preview.loadStory({ storyId });
  const context = preview.getStoryContext(story);
  const chromatic = context.parameters.chromatic ?? {};
  const viewport = context.parameters.viewport ?? {};

  return {
    globals: { viewport: context.globals.viewport },
    parameters: {
      chromatic: {
        cropToViewport: chromatic.cropToViewport,
        delay: chromatic.delay,
        diffIncludeAntiAliasing: chromatic.diffIncludeAntiAliasing,
        diffThreshold: chromatic.diffThreshold,
        disable: chromatic.disable,
        disableSnapshot: chromatic.disableSnapshot,
        forcedColors: chromatic.forcedColors,
        ignoreSelectors: chromatic.ignoreSelectors,
        media: chromatic.media,
        modes: chromatic.modes,
        pauseAnimationAtEnd: chromatic.pauseAnimationAtEnd,
        prefersReducedMotion: chromatic.prefersReducedMotion,
        viewports: chromatic.viewports,
      },
      viewport: { options: viewport.options },
    },
  };
}

interface MediaEmulation {
  forcedColors: Shot["forcedColors"];
  media: Shot["media"];
  reducedMotion: Shot["prefersReducedMotion"];
}

function mediaOf(shot: Shot): MediaEmulation {
  return {
    forcedColors: shot.forcedColors,
    media: shot.media,
    reducedMotion: shot.prefersReducedMotion,
  };
}

function sameMedia(left: MediaEmulation, right: MediaEmulation): boolean {
  return (
    left.forcedColors === right.forcedColors &&
    left.media === right.media &&
    left.reducedMotion === right.reducedMotion
  );
}

function applyGlobals(globals: ShotGlobals): void {
  const preview = globalThis.__STORYBOOK_PREVIEW__;
  globalThis.__storyStatus = undefined;
  preview?.channel.emit("updateGlobals", { globals });
}

// ponytail: CSS/WAAPI only. rAF loops need chromatic.delay.
function pauseAnimations(atEnd: boolean): void {
  // page.evaluate ships this function alone, so this helper cannot move out.
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function isFiniteDuration(duration: unknown): duration is number {
    return typeof duration === "number" && Number.isFinite(duration);
  }

  for (const animation of document.getAnimations()) {
    const duration = animation.effect?.getComputedTiming().duration;

    if (atEnd && isFiniteDuration(duration)) {
      animation.currentTime = duration;
    } else if (!atEnd) {
      animation.currentTime = 0;
    }

    animation.pause();
  }
}

interface StoryFinishedPayload {
  status?: string;
}

interface UpdateGlobalsPayload {
  globals: ShotGlobals;
}

interface StoryPreview {
  channel: {
    on: (event: string, cb: (payload: StoryFinishedPayload) => void) => void;
    emit: (event: string, payload: UpdateGlobalsPayload) => void;
  };
  ready?: () => Promise<void>;
  loadStory: (input: { storyId: string }) => Promise<PreparedStory>;
  getStoryContext: (story: PreparedStory) => {
    parameters: {
      chromatic?: PlanInput["parameters"]["chromatic"];
      viewport?: {
        options?: PlanInput["parameters"]["viewport"] extends infer V
          ? V extends { options?: infer O }
            ? O
            : never
          : never;
      };
    };
    globals: { viewport?: { value?: string; isRotated?: boolean } };
  };
}

interface PreparedStory {
  id: string;
}

declare global {
  var __STORYBOOK_PREVIEW__: StoryPreview | undefined;
  var __storyStatus: string | undefined;
}
