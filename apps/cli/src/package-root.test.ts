import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const cli = path.join(import.meta.dir, "cli.ts");

test("test from outside a Storybook package exits before capture", async () => {
  const outer = await mkdtemp(path.join(tmpdir(), "storybranch-cli-none-"));
  const result = await run(["test", "--url", "http://127.0.0.1:9"], outer);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("no Storybook package found");
  expect(await Bun.file(path.join(outer, ".storybranch")).exists()).toBe(false);
});

test("--cwd selects the package and does not write the outer tree", async () => {
  const outer = await mkdtemp(path.join(tmpdir(), "storybranch-cli-outer-"));
  const pkg = path.join(outer, "apps", "web");
  await mkdir(path.join(pkg, ".storybook"), { recursive: true });
  await writeFile(path.join(pkg, "package.json"), "{}\n");

  const result = await run(
    ["test", "--cwd", pkg, "--url", "http://127.0.0.1:9"],
    outer
  );

  expect(result.stderr).not.toContain("no Storybook package found");
  expect(result.exitCode).not.toBe(0);
  expect(await Bun.file(path.join(outer, ".storybranch")).exists()).toBe(false);
  expect(await Bun.file(path.join(pkg, ".storybranch")).exists()).toBe(false);
});

async function run(
  args: string[],
  cwd: string
): Promise<{ exitCode: number; stderr: string }> {
  const env = { ...process.env };
  delete env.STORYBRANCH_ROOT;

  const proc = Bun.spawn({
    cmd: ["bun", cli, ...args],
    cwd,
    env,
    stderr: "pipe",
    stdout: "pipe",
  });
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stderr };
}
