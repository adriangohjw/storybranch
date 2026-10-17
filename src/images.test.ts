import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { PNG } from "pngjs";

import { comparePng, promoteActuals } from "./images.ts";

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
  const actual = path.join(root, ".storybranch", "actual");
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
