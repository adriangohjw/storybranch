import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export function comparePng(
  baseline: Buffer,
  actual: Buffer,
  options: { threshold: number; includeAA: boolean }
):
  | { match: true }
  | { match: false; reason: "size" }
  | { match: false; reason: "pixels"; diff: Buffer } {
  const left = PNG.sync.read(baseline);
  const right = PNG.sync.read(actual);
  if (left.width !== right.width || left.height !== right.height) {
    return { match: false, reason: "size" };
  }

  const diff = new PNG({ height: left.height, width: left.width });
  const mismatched = pixelmatch(
    left.data,
    right.data,
    diff.data,
    left.width,
    left.height,
    {
      includeAA: options.includeAA,
      threshold: options.threshold,
    }
  );
  if (mismatched === 0) {
    return { match: true };
  }
  return {
    diff: Buffer.from(PNG.sync.write(diff)),
    match: false,
    reason: "pixels",
  };
}

export async function promoteActuals(
  root: string
): Promise<{ updated: string[]; removed: string[] }> {
  const actualDir = path.join(root, ".storybranch", "actual");
  const baselineDir = path.join(root, ".storybranch", "baseline");
  const actualNames = await readdir(actualDir);
  const actuals = actualNames
    .filter((file) => file.endsWith(".png"))
    .toSorted();
  await mkdir(baselineDir, { recursive: true });
  let baselines: string[] = [];
  try {
    const baselineNames = await readdir(baselineDir);
    baselines = baselineNames.filter((file) => file.endsWith(".png"));
  } catch {
    baselines = [];
  }
  const kept = new Set(actuals);
  const removed = baselines.filter((file) => !kept.has(file)).toSorted();
  await Promise.all(
    actuals.map(async (file) => {
      await copyFile(path.join(actualDir, file), path.join(baselineDir, file));
    })
  );
  await Promise.all(
    removed.map(async (file) => {
      await rm(path.join(baselineDir, file));
    })
  );
  return { removed, updated: actuals };
}
