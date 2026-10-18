import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { startStorybookStatic } from "@/static-server.ts";

const cli = path.join(import.meta.dir, "cli.ts");

test("serves a file inside the build directory", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "storybranch-static-"));
  await writeFile(path.join(dir, "index.json"), '{"ok":true}\n');
  const served = await startStorybookStatic(dir);

  try {
    const response = await fetch(new URL("index.json", `${served.url}/`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect((await fetch(`${served.url}/%2e%2e/package.json`)).status).toBe(404);
  } finally {
    served.stop();
  }
});

test("missing build directory names the path", async () => {
  const dir = path.join(tmpdir(), "storybranch-static-missing");

  await expect(startStorybookStatic(dir)).rejects.toThrow(
    `storybook build directory not found: ${path.resolve(dir)}`
  );
});

test("--build serves storybook-static under the package", async () => {
  const pkg = await storybookPackage();
  await mkdir(path.join(pkg, "storybook-static"));
  await writeFile(
    path.join(pkg, "storybook-static", "index.json"),
    '{"nope":true}\n'
  );

  const result = await run(["test", "--build"], pkg);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("was not a story index");
  expect(result.stderr).toContain("127.0.0.1");
});

test("--storybook-build-dir serves that directory", async () => {
  const pkg = await storybookPackage();
  const built = path.join(pkg, "out");
  await mkdir(built);
  await writeFile(path.join(built, "index.json"), '{"nope":true}\n');

  const result = await run(["test", "--storybook-build-dir", built], pkg);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("was not a story index");
});

test("--url and --build together print usage", async () => {
  const result = await run(
    ["test", "--url", "http://127.0.0.1:9", "--build"],
    tmpdir()
  );

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("--storybook-build-dir");
});

async function storybookPackage(): Promise<string> {
  const pkg = await mkdtemp(path.join(tmpdir(), "storybranch-build-pkg-"));
  await mkdir(path.join(pkg, ".storybook"));
  await writeFile(path.join(pkg, "package.json"), "{}\n");

  return pkg;
}

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
