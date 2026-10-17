import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { PNG } from "pngjs";

import { actualDirectory, comparePng, promoteActuals } from "@/images.ts";

function solid(
  width: number,
  height: number,
  pixel: [number, number, number, number]
): Buffer {
  const png = new PNG({ height, width });
  const [redChannel, green, blueChannel, alpha] = pixel;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      png.data[i] = redChannel;
      png.data[i + 1] = green;
      png.data[i + 2] = blueChannel;
      png.data[i + 3] = alpha;
    }
  }

  return PNG.sync.write(png);
}

const red = solid(2, 2, [255, 0, 0, 255]);
const blue = solid(2, 2, [0, 0, 255, 255]);

test("identical pngs match", () => {
  expect(comparePng(red, red, { includeAA: false, threshold: 0.1 })).toEqual({
    match: true,
  });
});

test("different pixels mismatch and return a diff", () => {
  const result = comparePng(red, blue, { includeAA: false, threshold: 0.1 });
  expect(result.match).toBe(false);

  if (result.match || result.reason !== "pixels") {
    throw new Error("expected a pixel diff");
  }

  expect(result.diff.byteLength).toBeGreaterThan(0);
});

test("different sizes mismatch without a diff image", () => {
  const wide = solid(3, 2, [255, 0, 0, 255]);
  expect(comparePng(red, wide, { includeAA: false, threshold: 0.1 })).toEqual({
    match: false,
    reason: "size",
  });
});

test("approve copies actuals and deletes stale baselines", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-"));
  const hash = await initRepo(root);
  const actual = path.join(root, ".storybranch", "actual", hash);
  expect(await actualDirectory(root)).toBe(actual);
  const baseline = path.join(root, ".storybranch", "baseline");
  await Bun.write(path.join(actual, "keep.png"), red);
  await Bun.write(path.join(baseline, "keep.png"), blue);
  await Bun.write(path.join(baseline, "stale.png"), blue);

  const result = await promoteActuals(root);
  expect(result).toEqual({ removed: ["stale.png"], updated: ["keep.png"] });
  expect(await Bun.file(path.join(baseline, "keep.png")).bytes()).toEqual(
    new Uint8Array(red)
  );
  expect(await Bun.file(path.join(baseline, "stale.png")).exists()).toBe(false);
  expect(await readdir(baseline)).toEqual(["keep.png"]);
});

async function initRepo(cwd: string): Promise<string> {
  for (const cmd of [
    ["git", "init"],
    [
      "git",
      "-c",
      "user.email=storybranch@example.com",
      "-c",
      "user.name=storybranch",
      "commit",
      "--allow-empty",
      "-m",
      "init",
    ],
  ]) {
    const proc = Bun.spawn(cmd, { cwd, stderr: "pipe", stdout: "ignore" });
    const stderr = await new Response(proc.stderr).text();

    if ((await proc.exited) !== 0) {
      throw new Error(stderr.trim() || cmd.join(" "));
    }
  }

  const proc = Bun.spawn(["git", "-C", cwd, "rev-parse", "HEAD"], {
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

  return stdout.trim();
}
