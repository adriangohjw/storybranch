import path from "node:path";

export const BROWSER_NAMES = ["chrome", "firefox", "edge", "safari"] as const;

export type BrowserName = (typeof BROWSER_NAMES)[number];

export interface StorybranchConfig {
  browsers: BrowserName[];
  captureParallel: boolean;
}

interface ConfigFile {
  browsers?: string[];
  captureParallel?: boolean;
}

const JSON_NAME = "storybranch.config.json";
const TS_NAME = "storybranch.config.ts";

export function parseBrowserList(names: readonly string[]): BrowserName[] {
  if (names.length === 0) {
    throw new Error(
      "browsers must be a non-empty list of chrome, firefox, edge, safari"
    );
  }

  const seen = new Set<string>();
  const browsers: BrowserName[] = [];

  for (const raw of names) {
    const name = canonicalBrowser(raw);

    if (name === undefined) {
      throw new Error(`unknown browser ${raw}`);
    }

    if (seen.has(name)) {
      throw new Error(`duplicate browser ${name}`);
    }

    seen.add(name);
    browsers.push(name);
  }

  return browsers;
}

export async function loadConfig(root: string): Promise<StorybranchConfig> {
  const jsonPath = path.join(root, JSON_NAME);
  const tsPath = path.join(root, TS_NAME);

  const [jsonExists, tsExists] = await Promise.all([
    Bun.file(jsonPath).exists(),
    Bun.file(tsPath).exists(),
  ]);

  if (jsonExists && tsExists) {
    throw new Error(`found both ${JSON_NAME} and ${TS_NAME}; keep one`);
  }

  if (jsonExists) {
    const parsed: unknown = await Bun.file(jsonPath).json();

    if (!isConfigFile(parsed)) {
      throw new Error("storybranch config must be an object");
    }

    return configFromFile(parsed);
  }

  if (tsExists) {
    const imported: unknown = await import(tsPath);

    if (!hasDefaultExport(imported)) {
      throw new Error(`${TS_NAME} must default-export a config object`);
    }

    if (!isConfigFile(imported.default)) {
      throw new Error("storybranch config must be an object");
    }

    return configFromFile(imported.default);
  }

  return { browsers: ["chrome"], captureParallel: false };
}

export function installHint(browser: BrowserName): string {
  if (browser === "firefox") {
    return "bunx playwright install firefox";
  }

  if (browser === "edge") {
    return "bunx playwright install msedge";
  }

  if (browser === "safari") {
    return "bunx playwright install webkit";
  }

  return "bunx playwright install chromium";
}

function configFromFile(file: ConfigFile): StorybranchConfig {
  return {
    browsers:
      file.browsers === undefined
        ? ["chrome"]
        : parseBrowserList(file.browsers),
    captureParallel: file.captureParallel ?? false,
  };
}

function isConfigFile(value: unknown): value is ConfigFile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  if (!("browsers" in value) && !("captureParallel" in value)) {
    return true;
  }

  if (
    "browsers" in value &&
    value.browsers !== undefined &&
    !isStringArray(value.browsers)
  ) {
    return false;
  }

  if (
    "captureParallel" in value &&
    value.captureParallel !== undefined &&
    typeof value.captureParallel !== "boolean"
  ) {
    return false;
  }

  return true;
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  for (const item of value) {
    if (typeof item !== "string") {
      return false;
    }
  }

  return true;
}

function canonicalBrowser(value: string): BrowserName | undefined {
  // ponytail: one filename. webkit is the Playwright engine name for safari.
  if (value === "webkit") {
    return "safari";
  }

  if (isBrowserName(value)) {
    return value;
  }

  return undefined;
}

function isBrowserName(value: string): value is BrowserName {
  for (const name of BROWSER_NAMES) {
    if (name === value) {
      return true;
    }
  }

  return false;
}

function hasDefaultExport(value: unknown): value is { default: unknown } {
  return typeof value === "object" && value !== null && "default" in value;
}
