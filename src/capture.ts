import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";
import type { Page } from "playwright";

import { actualDirectory, comparePng } from "@/images.ts";
import { isCapturable, planShots, shotFilename } from "@/plan.ts";
import type { PlanInput, Shot } from "@/plan.ts";

interface IndexEntry {
  id?: string;
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

export async function capture(
  storybookUrl: string,
  root: string
): Promise<string[]> {
  const base = storybookBase(storybookUrl);
  const indexUrl = new URL("index.json", base);
  const response = await fetch(indexUrl);
  if (!response.ok) {
    return [`index.json returned ${response.status} from ${indexUrl}`];
  }
  const body: unknown = await response.json();
  if (!isStoryIndex(body)) {
    return [`index.json from ${indexUrl} was not a story index`];
  }
  const stories = Object.entries(body.entries)
    .map(([key, entry]) => ({ ...entry, id: entry.id ?? key }))
    .filter((entry) => isCapturable(entry))
    .toSorted((a, b) => a.id.localeCompare(b.id));

  const actualDir = await actualDirectory(root);
  const diffDir = path.join(root, ".storybranch", "diff");
  const baselineDir = path.join(root, ".storybranch", "baseline");
  await mkdir(actualDir, { recursive: true });
  await mkdir(diffDir, { recursive: true });

  const failures: string[] = [];
  const expected = new Set<string>();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { height: 900, width: 1200 },
    });
    const page = await context.newPage();
    await page.addInitScript(installStoryHook);

    for (const story of stories) {
      const iframe = new URL("iframe.html", base);
      iframe.searchParams.set("id", story.id);
      iframe.searchParams.set("viewMode", "story");
      try {
        await shootStory(
          page,
          iframe.toString(),
          story.id,
          actualDir,
          diffDir,
          baselineDir,
          expected,
          failures
        );
      } catch (error) {
        failures.push(
          `${story.id} ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } finally {
    await browser.close();
  }

  let baselines: string[] = [];
  try {
    const baselineNames = await readdir(baselineDir);
    baselines = baselineNames.filter((file) => file.endsWith(".png"));
  } catch {
    baselines = [];
  }
  for (const baselineFile of baselines
    .filter((entry) => !expected.has(entry))
    .toSorted()) {
    failures.push(`stale ${baselineFile}`);
  }
  return failures;
}

async function shootStory(
  page: Page,
  iframeUrl: string,
  storyId: string,
  actualDir: string,
  diffDir: string,
  baselineDir: string,
  expected: Set<string>,
  failures: string[]
): Promise<void> {
  await page.setViewportSize({ height: 900, width: 1200 });
  await page.goto(iframeUrl, { waitUntil: "load" });
  await waitForStory(page);
  const input = await page.evaluate(readPlanInput, storyId);
  const plan = planShots(input);
  if ("skip" in plan) {
    return;
  }
  if ("error" in plan) {
    failures.push(`${storyId} ${plan.error}`);
    return;
  }

  for (const shot of plan.shots) {
    const filename = shotFilename(storyId, shot.label);
    expected.add(filename);
    await page.setViewportSize({ height: shot.height, width: shot.width });
    if (Object.keys(shot.globals).length > 0) {
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
    const png = await stablePng(page, shot);
    const actualPath = path.join(actualDir, filename);
    await Bun.write(actualPath, png);

    const baselinePath = path.join(baselineDir, filename);
    const baseline = Bun.file(baselinePath);
    if (!(await baseline.exists())) {
      failures.push(`missing baseline ${filename}`);
      continue;
    }
    const result = comparePng(Buffer.from(await baseline.bytes()), png, {
      includeAA: shot.includeAA,
      threshold: shot.threshold,
    });
    if (result.match) {
      continue;
    }
    if (result.reason === "pixels") {
      await Bun.write(path.join(diffDir, filename), result.diff);
    }
    failures.push(`${result.reason} ${filename}`);
  }
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

async function stablePng(page: Page, shot: Shot): Promise<Buffer> {
  const root = page.locator("#storybook-root");
  let previous: Buffer | null = null;
  for (let attempt = 0; attempt < STABLE_FRAMES; attempt += 1) {
    const png = await takePng(page, root, shot);
    if (previous !== null && previous.equals(png)) {
      return png;
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
        modes: chromatic.modes,
        pauseAnimationAtEnd: chromatic.pauseAnimationAtEnd,
        viewports: chromatic.viewports,
      },
      viewport: { options: viewport.options },
    },
  };
}

function applyGlobals(globals: Record<string, unknown>): void {
  const preview = globalThis.__STORYBOOK_PREVIEW__;
  globalThis.__storyStatus = undefined;
  preview?.channel.emit("updateGlobals", { globals });
}

// ponytail: CSS/WAAPI only. rAF loops need chromatic.delay.
function pauseAnimations(atEnd: boolean): void {
  for (const animation of document.getAnimations()) {
    const duration = animation.effect?.getComputedTiming().duration;
    if (atEnd && typeof duration === "number" && Number.isFinite(duration)) {
      animation.currentTime = duration;
    } else if (!atEnd) {
      animation.currentTime = 0;
    }
    animation.pause();
  }
}

interface StoryPreview {
  channel: {
    on: (event: string, cb: (payload: { status?: string }) => void) => void;
    emit: (event: string, payload: unknown) => void;
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

type PreparedStory = object;

declare global {
  var __STORYBOOK_PREVIEW__: StoryPreview | undefined;
  var __storyStatus: string | undefined;
}
