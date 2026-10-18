import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

export interface ChromaticConfig {
  autoAcceptChanges: boolean;
  exitZeroOnChanges: boolean;
  externals: string[];
  onlyChanged: boolean;
  storybookBuildDir?: string;
  untraced: string[];
}

export interface OnlyChangedFilter {
  externals: string[];
  packagePrefix: string;
  repoPaths: string[];
  untraced: string[];
}

export interface ChangeSet {
  packagePrefix: string;
  repoPaths: string[];
}

const EMPTY_CONFIG: ChromaticConfig = {
  autoAcceptChanges: false,
  exitZeroOnChanges: false,
  externals: [],
  onlyChanged: false,
  untraced: [],
};

const VISUAL_FAILURE = /^(?<kind>missing baseline|pixels|size|stale) /u;

export function isVisualFailure(line: string): boolean {
  return VISUAL_FAILURE.test(line);
}

export function testShouldFail(
  failures: string[],
  flags: { autoAcceptChanges: boolean; exitZeroOnChanges: boolean }
): boolean {
  if (failures.length === 0) {
    return false;
  }

  if (failures.some((line) => !isVisualFailure(line))) {
    return true;
  }

  return !(flags.exitZeroOnChanges || flags.autoAcceptChanges);
}

export function pickStories<T extends { importPath?: string }>(
  stories: T[],
  filter: OnlyChangedFilter
) {
  const changed = filter.repoPaths.filter(
    (file) => !matchesAny(file, filter.untraced)
  );

  if (changed.length === 0) {
    return { full: false, stories: [] };
  }

  if (
    stories.some((story) => story.importPath === undefined) ||
    changed.some((file) => matchesAny(file, filter.externals)) ||
    changed.some((file) => !underPrefix(file, filter.packagePrefix))
  ) {
    return { full: true, stories };
  }

  const files = changed.map((file) => stripPrefix(file, filter.packagePrefix));

  const selected = stories.filter((story) =>
    files.some((file) => sameFile(storyFile(story.importPath), file))
  );

  if (
    files.some(
      (file) =>
        !selected.some((story) => sameFile(storyFile(story.importPath), file))
    )
  ) {
    return { full: true, stories };
  }

  return { full: false, stories: selected };
}

export async function loadChromaticConfig(
  root: string
): Promise<ChromaticConfig> {
  const file = path.join(root, "chromatic.config.json");

  if (!(await fileExists(file))) {
    return EMPTY_CONFIG;
  }

  const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));

  if (!isChromaticFile(parsed)) {
    throw new Error("chromatic.config.json must be an object");
  }

  return {
    autoAcceptChanges: parsed.autoAcceptChanges ?? false,
    exitZeroOnChanges: parsed.exitZeroOnChanges ?? false,
    externals: splitGlobs(parsed.externals),
    onlyChanged: parsed.onlyChanged ?? false,
    storybookBuildDir: parsed.storybookBuildDir,
    untraced: splitGlobs(parsed.untraced),
  };
}

export async function gitChangeSet(root: string): Promise<ChangeSet | null> {
  const top = await git(root, ["rev-parse", "--show-toplevel"]);

  if (top === null) {
    return null;
  }

  const base = await changeBase(root);

  if (base === null) {
    return null;
  }

  const [tracked, untracked] = await Promise.all([
    git(root, ["diff", "--name-only", "--diff-filter=ACMRD", base]),
    git(root, ["ls-files", "--others", "--exclude-standard"]),
  ]);

  if (tracked === null || untracked === null) {
    return null;
  }

  const prefix = path.relative(top.trim(), root).split(path.sep).join("/");

  return {
    packagePrefix: prefix === "" ? "" : prefix,
    repoPaths: [...lines(tracked), ...lines(untracked)],
  };
}

async function changeBase(root: string): Promise<string | null> {
  const fromEnv = process.env.GITHUB_BASE_REF;

  const refs =
    fromEnv === undefined || fromEnv === ""
      ? ["origin/HEAD", "origin/main", "origin/master", "main", "master"]
      : [`origin/${fromEnv}`, fromEnv];

  for (const ref of refs) {
    const verified = await git(root, ["rev-parse", "--verify", "--quiet", ref]);

    if (verified === null) {
      continue;
    }

    const base = await git(root, ["merge-base", "HEAD", ref]);

    if (base !== null && base.trim() !== "") {
      return base.trim();
    }
  }

  return null;
}

// oxlint-disable-next-line typescript/strict-void-return -- promisify adapts execFile's callback
const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf-8",
    });

    return stdout;
  } catch {
    return null;
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

interface ChromaticFile {
  autoAcceptChanges?: boolean;
  exitZeroOnChanges?: boolean;
  externals?: string | string[];
  onlyChanged?: boolean;
  storybookBuildDir?: string;
  untraced?: string | string[];
}

function isChromaticFile(value: unknown): value is ChromaticFile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  if (
    "autoAcceptChanges" in value &&
    value.autoAcceptChanges !== undefined &&
    typeof value.autoAcceptChanges !== "boolean"
  ) {
    return false;
  }

  if (
    "exitZeroOnChanges" in value &&
    value.exitZeroOnChanges !== undefined &&
    typeof value.exitZeroOnChanges !== "boolean"
  ) {
    return false;
  }

  if (
    "onlyChanged" in value &&
    value.onlyChanged !== undefined &&
    typeof value.onlyChanged !== "boolean"
  ) {
    return false;
  }

  if (
    "storybookBuildDir" in value &&
    (typeof value.storybookBuildDir !== "string" ||
      value.storybookBuildDir === "")
  ) {
    return false;
  }

  if ("externals" in value && !isGlobValue(value.externals)) {
    return false;
  }

  if ("untraced" in value && !isGlobValue(value.untraced)) {
    return false;
  }

  return true;
}

function isGlobValue(value: unknown): value is string | string[] {
  if (typeof value === "string") {
    return true;
  }

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

function splitGlobs(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function underPrefix(file: string, prefix: string): boolean {
  if (prefix === "") {
    return true;
  }

  return file === prefix || file.startsWith(`${prefix}/`);
}

function stripPrefix(file: string, prefix: string): string {
  if (prefix === "" || file === prefix) {
    return file;
  }

  return file.slice(prefix.length + 1);
}

function storyFile(importPath: string | undefined): string {
  if (importPath === undefined) {
    return "";
  }

  return importPath.replaceAll("\\", "/").replace(/^\.\//u, "");
}

function sameFile(importPath: string, changed: string): boolean {
  return (
    importPath === changed ||
    importPath.endsWith(`/${changed}`) ||
    changed.endsWith(`/${importPath}`)
  );
}

function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((pattern) => globMatch(file, pattern));
}

// ponytail: * and ** only. Picomatch extglobs if a Chromatic config needs them.
function globMatch(file: string, pattern: string): boolean {
  const body = pattern
    .replaceAll("\\", "/")
    .replace(/^\.\//u, "")
    .replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("**", "{{GLOBSTAR}}")
    .replaceAll("*", "[^/]*")
    .replaceAll("{{GLOBSTAR}}", ".*");

  return new RegExp(`^${body}$`, "u").test(file);
}
