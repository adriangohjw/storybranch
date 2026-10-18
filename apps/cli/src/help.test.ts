import { expect, test } from "bun:test";
import path from "node:path";

test("help prints the usage contract", async () => {
  const proc = Bun.spawn({
    cmd: ["bun", "src/cli.ts", "--help"],
    cwd: path.join(import.meta.dir, ".."),
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
});
