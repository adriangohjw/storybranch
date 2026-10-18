import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const bin = path.join(import.meta.dir, "../bin/storybranch.js");
const nodeVersion = new TextDecoder()
  .decode(Bun.spawnSync(["node", "-p", "process.versions.node"]).stdout)
  .trim();
const [nodeMajor = 0, nodeMinor = 0] = nodeVersion.split(".").map(Number);
const nodeStripsTypes = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 18);

test("help prints the usage contract", async () => {
  const { code, stdout } = await runNode(["--help"]);

  expect(code).toBe(0);
  expect(stdout).toContain("missing baseline");
  expect(stdout).toContain(".storybranch/baseline/");
  expect(stdout).toContain("report.json");
  expect(stdout).toContain("first run");
  expect(stdout).toContain("safari");
  expect(stdout).toContain("webkit");
  expect(stdout).toContain("Linux");
  expect(stdout).toContain("--only-changed");
  expect(stdout).toContain("--exit-zero-on-changes");
  expect(stdout).toContain("--auto-accept-changes");
  expect(stdout).toContain("--exit-once");
  expect(stdout).toContain("CHROMATIC_PROJECT_TOKEN");
});

test.skipIf(!nodeStripsTypes)(
  "node loads a TypeScript config without bun",
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), "storybranch-node-config-"));
    await mkdir(path.join(root, ".storybook"));
    await writeFile(path.join(root, "package.json"), "{}\n");
    await writeFile(
      path.join(root, "storybranch.config.ts"),
      "export default { browsers: ['nope'] }\n"
    );

    const { code, stderr } = await runNode([
      "test",
      "--cwd",
      root,
      "--url",
      "http://127.0.0.1:9",
    ]);

    expect(code).toBe(1);
    expect(stderr).toContain("unknown browser nope");
  }
);

async function runNode(
  args: string[]
): Promise<{ code: number; stderr: string; stdout: string }> {
  const proc = Bun.spawn({
    cmd: ["node", bin, ...args],
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { code, stderr, stdout };
}
