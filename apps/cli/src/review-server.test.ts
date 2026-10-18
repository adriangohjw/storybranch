import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { writeReport } from "@storybranch/report";
import type { Report } from "@storybranch/report";

import { startReviewServer } from "@/review-server.ts";

test("accept copies the reported actual and the report route shows it", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-review-"));
  const filename = "story__shot__chrome.png";
  const actualDir = path.join(root, ".storybranch", "actual", "abc");
  const png = Buffer.from("reported-png");
  await Bun.write(path.join(actualDir, filename), png);

  const report: Report = {
    actualDir,
    commit: "abc",
    createdAt: new Date().toISOString(),
    entries: [
      {
        actualPath: path.join(actualDir, filename),
        filename,
        shotLabel: "shot",
        status: "new",
        storyId: "story",
      },
    ],
    root,
  };

  await writeReport(root, report);
  const removePlaceholder = await ensureReviewIndex();
  const server = await startReviewServer({ once: false, port: 0, root });

  try {
    const before = (await fetch(`${server.url}/api/report`).then((response) =>
      response.json()
    )) as Report;

    expect(before.entries[0]?.status).toBe("new");

    const accepted = await fetch(
      `${server.url}/api/accept/${encodeURIComponent(filename)}`,
      { method: "POST" }
    );

    expect(accepted.status).toBe(200);

    const body = (await accepted.json()) as Report;

    expect(body.entries[0]?.status).toBe("unchanged");
    expect(
      await Bun.file(
        path.join(root, ".storybranch", "baseline", filename)
      ).bytes()
    ).toEqual(new Uint8Array(png));

    const image = await fetch(`${server.url}/images/actual/${filename}`);

    expect(image.status).toBe(200);
    expect(await image.bytes()).toEqual(new Uint8Array(png));

    const missing = await fetch(`${server.url}/images/actual/other.png`);

    expect(missing.status).toBe(404);
  } finally {
    server.stop();
    await removePlaceholder();
  }
});

async function ensureReviewIndex(): Promise<() => Promise<void>> {
  const index = path.join(
    import.meta.dir,
    "..",
    "review",
    "public",
    "index.html"
  );

  if (await Bun.file(index).exists()) {
    return async () => undefined;
  }

  await Bun.write(index, "<!doctype html>");

  return async () => {
    await rm(index, { force: true });
  };
}
