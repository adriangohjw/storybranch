import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { needsAttention, readReport, writeReport } from "@storybranch/report";
import type { Report } from "@storybranch/report";

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

export async function approve(
  root: string
): Promise<{ removed: number; updated: number }> {
  const before = await readReport(root);

  await acceptAllAttention(root);

  return {
    removed: before.entries.filter(
      (entry) => entry.filename !== undefined && entry.status === "stale"
    ).length,
    updated: before.entries.filter(
      (entry) =>
        entry.filename !== undefined &&
        (entry.status === "new" || entry.status === "changed")
    ).length,
  };
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
