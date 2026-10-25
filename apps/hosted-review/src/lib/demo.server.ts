import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Report } from "@storybranch/report";
import { isReport } from "@storybranch/report";

import demoReportJson from "../../demo/report.json";
import type { ReviewState } from "~/lib/db.server";
import { safeFilename } from "~/lib/keys";

const demoRoot = path.join(import.meta.dirname, "../../demo");

export type DemoImageKind = "actual" | "baseline" | "diff";

export function demoReport(): Report {
  if (!isReport(demoReportJson)) {
    throw new Error("invalid demo report");
  }

  return demoReportJson;
}

export interface DemoRunPayload {
  comments: Record<string, never>;
  report: Report;
  review: Record<string, ReviewState>;
  run: {
    branch: string;
    commitSha: string;
    createdAt: string;
    prNumber: number;
  };
}

export function demoRunPayload(): DemoRunPayload {
  const report = demoReport();

  return {
    comments: {},
    report,
    review: {
      "hero--default__1200x900__chrome.png": "accepted",
      "hero--modes__narrow__chrome.png": "changes_requested",
    },
    run: {
      branch: "demo/fixture-snapshots",
      commitSha: report.commit,
      createdAt: report.createdAt,
      prNumber: 42,
    },
  };
}

export async function readDemoImage(
  kind: DemoImageKind,
  filename: string
): Promise<Buffer | undefined> {
  if (!safeFilename(filename)) {
    return undefined;
  }

  const key = `images/${kind}/${filename}`;
  const fsPath = path.join(demoRoot, key);

  try {
    return await readFile(fsPath);
  } catch {
    try {
      const { useStorage } = await import("nitro/storage");
      const raw = await useStorage("assets:demo").getItemRaw(key);

      if (raw === null || raw === undefined) {
        return undefined;
      }

      return Buffer.from(raw);
    } catch {
      return undefined;
    }
  }
}
