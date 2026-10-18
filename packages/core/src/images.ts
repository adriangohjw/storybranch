import path from "node:path";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** Chromatic Diff Inspector “neon green”; sampled from chromaui/chromatic-docs `diff-inspector.png`. */
export const DIFF_HIGHLIGHT_RGB: [number, number, number] = [125, 233, 80];

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
      // Mask, not a faded copy of the whole image. An opaque diff screen-blends
      // into a solid block and hides the text the pixels actually differ on.
      diffColor: DIFF_HIGHLIGHT_RGB,
      diffColorAlt: DIFF_HIGHLIGHT_RGB,
      diffMask: true,
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

export async function actualDirectory(root: string): Promise<string> {
  const proc = Bun.spawn(["git", "-C", root, "rev-parse", "HEAD"], {
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(stderr.trim() || "git rev-parse HEAD failed");
  }

  return path.join(root, ".storybranch", "actual", stdout.trim());
}
