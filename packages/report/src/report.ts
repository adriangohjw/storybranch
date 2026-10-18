import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  durationMs?: number;
  entries: ReportEntry[];
  root: string;
  storyCount?: number;
}

export const CAPTURE_BROWSER = "chrome";

export interface StoryParts {
  component: string;
  story: string;
}

export function storyPartsFromId(storyId: string): StoryParts {
  const marker = "--";
  const index = storyId.indexOf(marker);

  if (index === -1) {
    return { component: storyId, story: "default" };
  }

  return {
    component: storyId.slice(0, index),
    story: storyId.slice(index + marker.length),
  };
}

export const REPORT_PATH = ".storybranch/report.json";

export function shotFilename(
  storyId: string,
  label: string,
  browser: string
): string {
  return `${storyId}__${label.replaceAll(/[\\/]/gu, "_")}__${browser}.png`;
}

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

  if (
    browser === "chrome" ||
    browser === "firefox" ||
    browser === "edge" ||
    browser === "safari"
  ) {
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

export function attentionSummary(report: Report): string | null {
  const counts = {
    changed: 0,
    error: 0,
    new: 0,
    stale: 0,
    unchanged: 0,
  };

  for (const entry of report.entries) {
    if (entry.status in counts) {
      counts[entry.status] += 1;
    }
  }

  const attention = counts.new + counts.changed + counts.stale + counts.error;

  if (attention === 0) {
    return null;
  }

  const parts = [
    `${attention} snapshot${attention === 1 ? "" : "s"} need attention`,
  ];

  if (counts.new > 0) {
    parts.push(`${counts.new} new`);
  }

  if (counts.changed > 0) {
    parts.push(`${counts.changed} changed`);
  }

  if (counts.stale > 0) {
    parts.push(`${counts.stale} stale`);
  }

  if (counts.error > 0) {
    parts.push(`${counts.error} error`);
  }

  return parts.join(" · ");
}

export function terminalAttentionBlock(report: Report): string[] | null {
  const summary = attentionSummary(report);

  if (summary === null) {
    return null;
  }

  const scanned = report.entries.filter(
    (entry) =>
      entry.status === "new" ||
      entry.status === "changed" ||
      entry.status === "unchanged"
  ).length;

  const seconds = ((report.durationMs ?? 0) / 1000).toFixed(1);

  const lines = [
    `${scanned} snapshot${scanned === 1 ? "" : "s"} scanned · ${seconds}s build time`,
    summary,
  ];

  for (const entry of report.entries) {
    if (!needsAttention(entry.status)) {
      continue;
    }

    const name = entry.filename?.replace(/\.png$/u, "") ?? entry.storyId;
    lines.push(`-> ${entry.status}: ${name}`);
  }

  return lines;
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

export function isReport(value: unknown): value is Report {
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

  if (
    "durationMs" in value &&
    value.durationMs !== undefined &&
    typeof value.durationMs !== "number"
  ) {
    return false;
  }

  if (
    "storyCount" in value &&
    value.storyCount !== undefined &&
    typeof value.storyCount !== "number"
  ) {
    return false;
  }

  return "entries" in value && Array.isArray(value.entries);
}
