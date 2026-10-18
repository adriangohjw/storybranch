import { expect, test } from "bun:test";
import path from "node:path";

test("help prints the usage contract", async () => {
  const proc = Bun.spawn({
    cmd: [path.join(import.meta.dir, "../bin/storybranch.js"), "--help"],
    stderr: "pipe",
    stdout: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const code = await proc.exited;

  expect(code).toBe(0);
  expect(stdout).toContain("missing baseline");
  expect(stdout).toContain(".storybranch/baseline/");
  expect(stdout).toContain("report.json");
  expect(stdout).toContain("first run");
  expect(stdout).toContain("safari");
  expect(stdout).toContain("webkit");
  expect(stdout).toContain("Linux");
  expect(stdout).toContain("--only-changed");
  expect(stdout).toContain("--changed-files");
  expect(stdout).toContain("--exit-zero-on-changes");
  expect(stdout).toContain("--auto-accept-changes");
  expect(stdout).toContain("--exit-once");
  expect(stdout).toContain("CHROMATIC_PROJECT_TOKEN");
});
