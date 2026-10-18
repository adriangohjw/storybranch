import { expect, test } from "bun:test";
import { cp, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.join(import.meta.dir, "../../..");
const port = 6019;
const url = `http://127.0.0.1:${port}`;

test(
  "fixture stories capture, approve, and match",
  async () => {
    const storybook = Bun.spawn({
      cmd: [
        "bunx",
        "storybook",
        "dev",
        "-p",
        String(port),
        "--ci",
        "--exact-port",
        "--config-dir",
        "packages/fixture/.storybook",
        "--no-open",
      ],
      cwd: root,
      stderr: "pipe",
      stdout: "pipe",
    });

    const logs: Uint8Array[] = [];

    const collect = async (stream: ReadableStream<Uint8Array> | null) => {
      if (!stream) {
        return;
      }

      for await (const chunk of stream) {
        logs.push(chunk);
      }
    };

    const logging = Promise.all([
      collect(storybook.stdout),
      collect(storybook.stderr),
    ]);

    try {
      await waitForIndex(url);
      const work = await mkdtemp(path.join(tmpdir(), "storybranch-e2e-"));
      const fixturePkg = path.join(root, "packages/fixture");

      for (const name of await readdir(fixturePkg)) {
        await cp(path.join(fixturePkg, name), path.join(work, name), {
          recursive: true,
        });
      }
      const hash = await initRepo(work);
      await installPackedCli(work);
      const first = await run(["test", "--url", url], work);
      expect(
        await Bun.file(
          path.join(
            work,
            ".storybranch",
            "actual",
            hash,
            "hero--default__1200x900.png"
          )
        ).exists()
      ).toBe(true);
      expect(first.exitCode).toBe(1);
      expect(first.stderr).toContain("missing baseline");

      const approved = await run(["approve"], work);
      expect(approved.exitCode).toBe(0);

      const second = await run(["test", "--url", url], work);
      expect(second.stderr).toBe("");
      expect(second.exitCode).toBe(0);

      const baselineDir = path.join(work, ".storybranch", "baseline");
      const baselineNames = await readdir(baselineDir);
      const baselines = baselineNames.toSorted();
      expect(baselines).toEqual([
        "hero--default__1200x900.png",
        "hero--modes__narrow.png",
        "hero--modes__wide.png",
        "hero--pinned__mobile1.png",
      ]);
    } catch (error) {
      const text = Buffer.concat(logs).toString();
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\n${text}`,
        { cause: error }
      );
    } finally {
      storybook.kill();
      await logging.catch(() => {});
    }
  },
  { timeout: 180_000 }
);

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

async function waitForIndex(storybookUrl: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let last = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("index.json", `${storybookUrl}/`));

      if (response.ok) {
        return;
      }

      last = `${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }

    await Bun.sleep(500);
  }

  throw new Error(`storybook did not serve index.json: ${last}`);
}

async function installPackedCli(cwd: string): Promise<void> {
  const destination = await mkdtemp(path.join(tmpdir(), "storybranch-pack-"));
  const pack = Bun.spawn({
    cmd: ["bun", "pm", "pack", "--quiet", `--destination=${destination}`],
    cwd: path.join(root, "apps/cli"),
    stderr: "pipe",
    stdout: "pipe",
  });
  const [packOut, packErr, packCode] = await Promise.all([
    new Response(pack.stdout).text(),
    new Response(pack.stderr).text(),
    pack.exited,
  ]);

  if (packCode !== 0) {
    throw new Error(packErr.trim() || packOut.trim() || "bun pm pack failed");
  }

  const tarball = packOut.trim().split("\n").at(-1);

  if (tarball === undefined || tarball.length === 0) {
    throw new Error("bun pm pack did not print a tarball path");
  }

  const add = Bun.spawn({
    cmd: ["bun", "add", "--ignore-scripts", tarball],
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [addOut, addErr, addCode] = await Promise.all([
    new Response(add.stdout).text(),
    new Response(add.stderr).text(),
    add.exited,
  ]);

  if (addCode !== 0) {
    throw new Error(addErr.trim() || addOut.trim() || "bun add tarball failed");
  }

  const manifest = (await Bun.file(
    path.join(cwd, "node_modules/@adriangohjw/storybranch/package.json")
  ).json()) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  expect(manifest.devDependencies).toBeUndefined();
  expect(manifest.scripts).toEqual({
    postinstall: "playwright install chromium",
  });

  for (const version of Object.values(manifest.dependencies ?? {})) {
    expect(version).not.toBe("catalog:");
    expect(version.startsWith("workspace:")).toBe(false);
  }
}

async function run(
  args: string[],
  cwd: string
): Promise<{ exitCode: number; stderr: string }> {
  const proc = Bun.spawn({
    cmd: [path.join(cwd, "node_modules/.bin/storybranch"), ...args],
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(`cli exited ${exitCode}\n${stdout}\n${stderr}`);
  }

  return { exitCode, stderr };
}
