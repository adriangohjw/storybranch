import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { readReport, writeReport } from "@storybranch/report";
import type { Report } from "@storybranch/report";

import { acceptAllAttention, acceptEntry, approve } from "@/store.ts";

const red = Buffer.from("reported-png");
const blue = Buffer.from("later-head-png");

test("accept copies the report actual, not a later git HEAD", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-store-"));
  const reportedCommit = await initRepo(root);
  const filename = "story__shot__chrome.png";
  const reportedDir = path.join(root, ".storybranch", "actual", reportedCommit);
  await Bun.write(path.join(reportedDir, filename), red);

  await commitEmpty(root);
  const head = await gitHead(root);
  expect(head).not.toBe(reportedCommit);
  await Bun.write(
    path.join(root, ".storybranch", "actual", head, filename),
    blue
  );

  await writeReport(root, report(root, reportedDir, filename, "new"));
  const updated = await acceptEntry(root, filename);

  expect(updated.entries[0]?.status).toBe("unchanged");
  expect(
    await Bun.file(
      path.join(root, ".storybranch", "baseline", filename)
    ).bytes()
  ).toEqual(new Uint8Array(red));
});

test("acceptAll promotes new shots and removes only reported stale baselines", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-store-"));
  const actualDir = path.join(root, ".storybranch", "actual", "abc");
  const baselineDir = path.join(root, ".storybranch", "baseline");
  const kept = "keep__shot__chrome.png";
  const stale = "stale__shot__chrome.png";
  await Bun.write(path.join(actualDir, kept), red);
  await Bun.write(path.join(baselineDir, stale), blue);
  await Bun.write(path.join(baselineDir, "extra.png"), blue);

  const body = report(root, actualDir, kept, "new");
  body.entries.push({
    baselinePath: path.join(baselineDir, stale),
    filename: stale,
    shotLabel: "shot",
    status: "stale",
    storyId: "stale",
  });
  await writeReport(root, body);

  const updated = await approve(root);
  expect(updated).toEqual({ removed: 1, updated: 1 });
  expect((await readReport(root)).entries.map((entry) => entry.status)).toEqual(
    ["unchanged", "unchanged"]
  );
  expect(await Bun.file(path.join(baselineDir, kept)).bytes()).toEqual(
    new Uint8Array(red)
  );
  expect(await Bun.file(path.join(baselineDir, stale)).exists()).toBe(false);
  expect(await Bun.file(path.join(baselineDir, "extra.png")).exists()).toBe(
    true
  );
});

test("acceptAll leaves error entries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-store-"));
  const body: Report = {
    actualDir: path.join(root, ".storybranch", "actual", "abc"),
    commit: "abc",
    createdAt: new Date().toISOString(),
    entries: [
      {
        message: "boom",
        status: "error",
        storyId: "broken",
      },
    ],
    root,
  };

  await writeReport(root, body);
  const updated = await acceptAllAttention(root);
  expect(updated.entries[0]?.status).toBe("error");
  expect(await readReport(root)).toEqual(updated);
});

function report(
  root: string,
  actualDir: string,
  filename: string,
  status: "new"
): Report {
  return {
    actualDir,
    commit: path.basename(actualDir),
    createdAt: new Date().toISOString(),
    entries: [
      {
        actualPath: path.join(actualDir, filename),
        filename,
        shotLabel: "shot",
        status,
        storyId: "story",
      },
    ],
    root,
  };
}

async function initRepo(cwd: string): Promise<string> {
  await git(cwd, ["git", "init"]);
  await commitEmpty(cwd);
  return await gitHead(cwd);
}

async function commitEmpty(cwd: string): Promise<void> {
  await git(cwd, [
    "git",
    "-c",
    "user.email=storybranch@example.com",
    "-c",
    "user.name=storybranch",
    "commit",
    "--allow-empty",
    "-m",
    "init",
  ]);
}

async function gitHead(cwd: string): Promise<string> {
  return (await git(cwd, ["git", "-C", cwd, "rev-parse", "HEAD"])).trim();
}

async function git(cwd: string, cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { cwd, stderr: "pipe", stdout: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(stderr.trim() || cmd.join(" "));
  }

  return stdout;
}
