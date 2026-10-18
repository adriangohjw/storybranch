import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type ShotStatus = "unchanged" | "changed" | "new" | "stale" | "error";

export interface ReportEntry {
  actualPath?: string;
  baselinePath?: string;
  browser?: string;
  diffPath?: string;
  filename?: string;
  message?: string;
  shotLabel?: string;
  status: ShotStatus;
  storyId: string;
}

export interface Report {
  actualDir: string;
  commit: string;
  createdAt: string;
  entries: ReportEntry[];
  root: string;
}

export const REPORT_PATH = ".storybranch/report.json";

export function storyIdFromFilename(filename: string): string {
  const marker = "__";
  const index = filename.indexOf(marker);

  if (index === -1) {
    return filename.replace(/\.png$/u, "");
  }

  return filename.slice(0, index);
}

export function browserFromFilename(filename: string): string | undefined {
  const stem = filename.replace(/\.png$/u, "");
  const marker = "__";
  const index = stem.lastIndexOf(marker);

  if (index === -1) {
    return undefined;
  }

  const browser = stem.slice(index + marker.length);

  if (browser === "chrome" || browser === "firefox" || browser === "edge") {
    return browser;
  }

  return undefined;
}

export function shotLabelFromFilename(filename: string): string {
  const stem = filename.replace(/\.png$/u, "");
  const marker = "__";
  const start = stem.indexOf(marker);

  if (start === -1) {
    return filename;
  }

  const browser = browserFromFilename(filename);

  if (browser === undefined) {
    return stem.slice(start + marker.length);
  }

  const end = stem.lastIndexOf(marker);

  return stem.slice(start + marker.length, end);
}

export function needsAttention(status: ShotStatus): boolean {
  return status !== "unchanged";
}

export function reportHasAttention(report: Report): boolean {
  return report.entries.some((entry) => needsAttention(entry.status));
}

export function reportPath(root: string): string {
  return path.join(root, REPORT_PATH);
}

export async function readReport(root: string): Promise<Report> {
  const text = await readFile(reportPath(root), "utf-8");
  const parsed: unknown = JSON.parse(text);

  if (!isReport(parsed)) {
    throw new Error("invalid report.json");
  }

  return parsed;
}

export async function writeReport(root: string, report: Report): Promise<void> {
  const file = reportPath(root);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
}

export async function acceptEntry(
  root: string,
  filename: string
): Promise<Report> {
  const report = await readReport(root);
  const entry = report.entries.find((item) => item.filename === filename);

  if (entry === undefined) {
    throw new Error(`unknown snapshot ${filename}`);
  }

  if (entry.status === "error") {
    throw new Error(`cannot accept error entry ${filename}`);
  }

  if (entry.status === "unchanged") {
    return report;
  }

  const baselineDir = path.join(root, ".storybranch", "baseline");
  await mkdir(baselineDir, { recursive: true });
  const baselinePath = path.join(baselineDir, filename);

  if (entry.status === "stale") {
    await rm(baselinePath, { force: true });
    entry.baselinePath = undefined;
  } else {
    const { actualPath } = entry;

    if (actualPath === undefined) {
      throw new Error(`missing actual for ${filename}`);
    }

    await copyFile(actualPath, baselinePath);
    entry.baselinePath = baselinePath;
    entry.diffPath = undefined;
  }

  entry.status = "unchanged";
  entry.message = undefined;

  await writeReport(root, report);

  return report;
}

export async function acceptAllAttention(root: string): Promise<Report> {
  let report = await readReport(root);
  const filenames: string[] = [];

  for (const entry of report.entries) {
    if (
      entry.filename !== undefined &&
      needsAttention(entry.status) &&
      entry.status !== "error"
    ) {
      filenames.push(entry.filename);
    }
  }

  for (const filename of filenames) {
    report = await acceptEntry(root, filename);
  }

  return report;
}

function isReport(value: unknown): value is Report {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("commit" in value) || typeof value.commit !== "string") {
    return false;
  }

  if (!("actualDir" in value) || typeof value.actualDir !== "string") {
    return false;
  }

  if (!("createdAt" in value) || typeof value.createdAt !== "string") {
    return false;
  }

  if (!("root" in value) || typeof value.root !== "string") {
    return false;
  }

  return "entries" in value && Array.isArray(value.entries);
}
