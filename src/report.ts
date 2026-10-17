import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type ShotStatus = "unchanged" | "changed" | "new" | "stale" | "error";

export interface ReportEntry {
  actualPath?: string;
  baselinePath?: string;
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

export function shotLabelFromFilename(filename: string): string {
  const marker = "__";
  const index = filename.indexOf(marker);
  if (index === -1) {
    return filename;
  }
  return filename.slice(index + marker.length).replace(/\.png$/u, "");
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
  const text = await readFile(reportPath(root), "utf8");
  const parsed: unknown = JSON.parse(text);
  if (!isReport(parsed)) {
    throw new Error("invalid report.json");
  }
  return parsed;
}

export async function writeReport(root: string, report: Report): Promise<void> {
  const file = reportPath(root);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function acceptEntry(root: string, filename: string): Promise<Report> {
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
    entry.status = "unchanged";
    entry.baselinePath = undefined;
    entry.message = undefined;
  } else {
    const actualPath = entry.actualPath;
    if (actualPath === undefined) {
      throw new Error(`missing actual for ${filename}`);
    }
    await copyFile(actualPath, baselinePath);
    entry.status = "unchanged";
    entry.baselinePath = baselinePath;
    entry.diffPath = undefined;
    entry.message = undefined;
  }

  await writeReport(root, report);
  return report;
}

export async function acceptAllAttention(root: string): Promise<Report> {
  let report = await readReport(root);
  const filenames = report.entries
    .filter((entry) => entry.filename !== undefined && needsAttention(entry.status))
    .filter((entry) => entry.status !== "error")
    .map((entry) => entry.filename as string);
  for (const filename of filenames) {
    report = await acceptEntry(root, filename);
  }
  return report;
}

function isReport(value: unknown): value is Report {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.commit === "string" &&
    typeof record.actualDir === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.root === "string" &&
    Array.isArray(record.entries)
  );
}
