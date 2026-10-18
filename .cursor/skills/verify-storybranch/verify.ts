#!/usr/bin/env bun
/**
 * Isolated storybranch verification harness.
 * Creates a disposable Storybook package under /tmp, starts the repo smoke
 * fixture on its own port, and runs the storybranch CLI against that package.
 */
import { spawnSync } from "node:child_process";
import { openSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

interface RunState {
  repoHead: string;
  repoRoot: string;
  reviewPid: number | null;
  reviewPort: number;
  runId: string;
  storybookLog: string;
  storybookPid: number;
  storybookUrl: string;
  workDir: string;
}

const skillDir = import.meta.dir;
const evidenceRoot = path.join(skillDir, "artifacts");

function repoRoot(): string {
  let dir = skillDir;

  for (let i = 0; i < 6; i += 1) {
    dir = path.dirname(dir);
  }

  return path.resolve(skillDir, "../../..");
}

function runId(): string {
  const id = process.env.RUN_ID;

  if (id === undefined || id === "" || !/^[A-Za-z0-9._-]+$/u.test(id)) {
    console.error(
      "Set RUN_ID to a token of letters, numbers, dots, underscores, or hyphens."
    );
    process.exit(1);
  }

  return id;
}

function runDir(id: string): string {
  return path.join("/tmp", `storybranch-verify-${id}`);
}

function statePath(id: string): string {
  return path.join(runDir(id), "state.json");
}

async function readState(id: string): Promise<RunState> {
  const file = statePath(id);

  try {
    return JSON.parse(await readFile(file, "utf8")) as RunState;
  } catch {
    console.error(`No verification run for RUN_ID=${id}. Launch first.`);
    process.exit(1);
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function descendants(pid: number): number[] {
  const result = spawnSync("pgrep", ["-P", String(pid)], { encoding: "utf8" });
  const children = result.stdout
    .split("\n")
    .map((line) => Number(line))
    .filter((value) => Number.isInteger(value) && value > 0);
  return [pid, ...children.flatMap((child) => descendants(child))];
}

function listeners(port: number): number[] {
  const result = spawnSync(
    "lsof",
    ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
    { encoding: "utf8" }
  );

  return result.stdout
    .split("\n")
    .map((line) => Number(line))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function killTree(pid: number): void {
  if (!alive(pid)) {
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    throw new Error(stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return stdout.trim();
}

async function waitForIndex(url: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let last = "no response";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("index.json", `${url}/`));

      if (response.ok) {
        const body = await response.text();

        if (body.includes("smoke--default")) {
          return;
        }

        last = "index.json did not list smoke--default";
      } else {
        last = `HTTP ${response.status}`;
      }
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }

    await Bun.sleep(500);
  }

  throw new Error(`Storybook did not serve the smoke story: ${last}`);
}

async function warmPreview(url: string): Promise<void> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const iframe = `${url}/iframe.html?id=smoke--default&viewMode=story`;
    const deadline = Date.now() + 30_000;
    let last = "";

    while (Date.now() < deadline) {
      try {
        await page.goto(iframe, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("#storybook-root", { timeout: 2000 });
        return;
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
        await Bun.sleep(300);
      }
    }

    throw new Error(`Smoke preview did not render: ${last}`);
  } finally {
    await browser.close();
  }
}

async function ensureTooling(root: string): Promise<void> {
  const chromium = await import("playwright").then((playwright) =>
    playwright.chromium.executablePath()
  );
  const exe = Bun.file(chromium);

  if (!(await exe.exists())) {
    console.error(`Installing Playwright Chromium at ${chromium}`);
    const install = Bun.spawn(
      ["bunx", "playwright", "install", "chromium"],
      { cwd: root, stderr: "inherit", stdout: "inherit" }
    );

    if ((await install.exited) !== 0) {
      throw new Error("playwright install chromium failed");
    }
  }

  const reviewHtml = path.join(root, "apps/cli/review/public/index.html");
  const cliBundle = path.join(root, "apps/cli/dist/cli.js");

  if (!(await Bun.file(reviewHtml).exists())) {
    console.error("Building the review UI");
    const build = Bun.spawn(["bun", "run", "build"], {
      cwd: path.join(root, "apps/review-ui"),
      stderr: "inherit",
      stdout: "inherit",
    });

    if ((await build.exited) !== 0) {
      throw new Error("review UI build failed");
    }
  }

  if (!(await Bun.file(cliBundle).exists())) {
    console.error("Building the storybranch CLI");
    const build = Bun.spawn(["bun", "run", "build"], {
      cwd: path.join(root, "apps/cli"),
      stderr: "inherit",
      stdout: "inherit",
    });

    if ((await build.exited) !== 0) {
      throw new Error("CLI build failed");
    }
  }
}

async function launch(): Promise<void> {
  const id = runId();
  const root = repoRoot();
  const dir = runDir(id);

  if (await Bun.file(statePath(id)).exists()) {
    console.error(`RUN_ID=${id} already exists at ${dir}. Clean it up first.`);
    process.exit(1);
  }

  await ensureTooling(root);
  await mkdir(dir, { recursive: true });

  const work = await mkdtemp(path.join(dir, "work-"));
  await cp(path.join(root, "packages/fixture/.storybook"), path.join(work, ".storybook"), {
    recursive: true,
  });
  await writeFile(
    path.join(work, "package.json"),
    `${JSON.stringify({ name: "storybranch-verify", private: true }, null, 2)}\n`
  );
  await git(work, ["init"]);
  await git(work, [
    "-c",
    "user.email=storybranch-verify@example.com",
    "-c",
    "user.name=storybranch-verify",
    "commit",
    "--allow-empty",
    "-m",
    "verify",
  ]);

  const storybookPort = await freePort();
  const reviewPort = await freePort();
  const storybookUrl = `http://127.0.0.1:${storybookPort}`;
  const logPath = path.join(dir, "storybook.log");
  const logFd = openSync(logPath, "a");
  const storybook = Bun.spawn({
    cmd: [
      "bunx",
      "storybook",
      "dev",
      "-p",
      String(storybookPort),
      "--ci",
      "--exact-port",
      "--config-dir",
      "packages/fixture/.storybook",
      "--no-open",
    ],
    cwd: root,
    detached: true,
    env: { ...process.env, STORYBRANCH_FIXTURE: "smoke" },
    stderr: logFd,
    stdout: logFd,
  });
  storybook.unref();

  const state: RunState = {
    repoHead: await git(root, ["rev-parse", "HEAD"]),
    repoRoot: root,
    reviewPid: null,
    reviewPort,
    runId: id,
    storybookLog: logPath,
    storybookPid: storybook.pid,
    storybookUrl,
    workDir: work,
  };

  await writeFile(statePath(id), `${JSON.stringify(state, null, 2)}\n`);

  try {
    await waitForIndex(storybookUrl);
    await warmPreview(storybookUrl);
  } catch (error) {
    killTree(storybook.pid);
    throw error;
  }

  console.log(`RUN_ID=${id}`);
  console.log(`WORK=${work}`);
  console.log(`STORYBOOK_URL=${storybookUrl}`);
  console.log(`REVIEW_PORT=${reviewPort}`);
  console.log(`REPO_HEAD=${state.repoHead}`);
  process.exit(0);
}

function check(label: string, ok: boolean, detail: string): boolean {
  console.log(`${ok ? "ok" : "fail"} ${label}: ${detail}`);
  return ok;
}

async function doctor(): Promise<void> {
  const id = runId();
  const state = await readState(id);
  let passed = true;

  passed =
    check(
      "work-dir",
      state.workDir.startsWith(`/tmp/storybranch-verify-${id}/`),
      state.workDir
    ) && passed;
  passed =
    check(
      "package",
      (await Bun.file(path.join(state.workDir, "package.json")).text()).includes(
        "storybranch-verify"
      ),
      "disposable package.json"
    ) && passed;

  let head = "";

  try {
    head = await git(state.workDir, ["rev-parse", "HEAD"]);
  } catch (error) {
    head = error instanceof Error ? error.message : String(error);
  }

  passed = check("work-git", /^[0-9a-f]{40}$/u.test(head), head) && passed;

  const storyPids = descendants(state.storybookPid);
  const port = Number(new URL(state.storybookUrl).port);
  const owners = listeners(port);
  const owned = owners.some((pid) => storyPids.includes(pid));
  passed =
    check(
      "storybook-process",
      alive(state.storybookPid) && owned,
      `pid ${state.storybookPid} listeners ${owners.join(",") || "none"}`
    ) && passed;

  let indexOk = false;
  let indexDetail = "unreachable";

  try {
    const response = await fetch(new URL("index.json", `${state.storybookUrl}/`));
    const body = await response.text();
    indexOk = response.ok && body.includes("smoke--default");
    indexDetail = indexOk ? state.storybookUrl : `HTTP ${response.status}`;
  } catch (error) {
    indexDetail = error instanceof Error ? error.message : String(error);
  }

  passed = check("storybook-index", indexOk, indexDetail) && passed;

  const root = state.repoRoot;
  const reviewHtml = path.join(root, "apps/cli/review/public/index.html");
  const cliBundle = path.join(root, "apps/cli/dist/cli.js");
  passed =
    check("review-ui", await Bun.file(reviewHtml).exists(), reviewHtml) && passed;
  passed = check("cli-bundle", await Bun.file(cliBundle).exists(), cliBundle) && passed;

  const repoHead = await git(root, ["rev-parse", "HEAD"]);
  passed =
    check(
      "repo-head",
      repoHead === state.repoHead,
      `launch ${state.repoHead} now ${repoHead}`
    ) && passed;

  const bun = spawnSync("bun", ["--version"], { encoding: "utf8" });
  passed =
    check("bun", bun.stdout.trim().length > 0, bun.stdout.trim() || bun.stderr.trim()) &&
    passed;

  const chromiumPath = await import("playwright").then((playwright) =>
    playwright.chromium.executablePath()
  );
  passed =
    check(
      "chromium",
      await Bun.file(chromiumPath).exists(),
      chromiumPath
    ) && passed;

  if (state.reviewPid !== null) {
    const reviewOwners = listeners(state.reviewPort);
    passed =
      check(
        "review-server",
        alive(state.reviewPid) && reviewOwners.includes(state.reviewPid),
        `pid ${state.reviewPid} port ${state.reviewPort}`
      ) && passed;
  } else {
    console.log(`ok review-server: not started (reserved port ${state.reviewPort})`);
  }

  if (!passed) {
    console.error(`Doctor failed. Storybook log: ${state.storybookLog}`);
    process.exit(1);
  }
}

async function rememberReview(state: RunState, stdout: string): Promise<void> {
  if (!stdout.includes(`storybranch review at http://127.0.0.1:${state.reviewPort}`)) {
    return;
  }

  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const pids = listeners(state.reviewPort);

    if (pids.length > 0) {
      state.reviewPid = pids[0] ?? null;
      await writeFile(statePath(state.runId), `${JSON.stringify(state, null, 2)}\n`);
      return;
    }

    await Bun.sleep(200);
  }
}

async function cli(argv: string[]): Promise<void> {
  const separator = argv.indexOf("--");

  if (separator === -1 || argv[separator + 1] === undefined) {
    console.error(
      "usage: verify.ts cli [--evidence <name>] -- <storybranch args>"
    );
    process.exit(1);
  }

  const flags = argv.slice(0, separator);
  const args = argv.slice(separator + 1);
  let evidence = "";

  for (let i = 0; i < flags.length; i += 1) {
    if (flags[i] === "--evidence") {
      evidence = flags[i + 1] ?? "";
    }
  }

  if (flags.includes("--open") || args.includes("--open")) {
    console.error("Refusing --open. It launches the operator's browser.");
    process.exit(1);
  }

  const id = runId();
  const state = await readState(id);
  const command = [
    "bun",
    path.join(state.repoRoot, "apps/cli/bin/storybranch.js"),
    ...args,
  ];
  const proc = Bun.spawn(command, {
    cwd: state.workDir,
    env: {
      ...process.env,
      STORYBRANCH_ROOT: state.workDir,
    },
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  await rememberReview(state, stdout);

  process.stdout.write(stdout);
  process.stderr.write(stderr);
  console.error(`exit ${exitCode}`);

  if (evidence !== "") {
    const dest = path.join(evidenceRoot, id, evidence);
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(dest, "command.txt"), `${command.join(" ")}\n`);
    await writeFile(path.join(dest, "stdout.txt"), stdout);
    await writeFile(path.join(dest, "stderr.txt"), stderr);
    await writeFile(path.join(dest, "exit.txt"), `${exitCode}\n`);

    const report = path.join(state.workDir, ".storybranch/report.json");

    if (await Bun.file(report).exists()) {
      await writeFile(path.join(dest, "report.json"), await Bun.file(report).text());
    }

    const list = async (relative: string) => {
      const procList = Bun.spawn(["find", path.join(state.workDir, relative), "-type", "f"], {
        stderr: "pipe",
        stdout: "pipe",
      });
      const text = await new Response(procList.stdout).text();
      await procList.exited;
      return text;
    };

    await writeFile(path.join(dest, "baseline.txt"), await list(".storybranch/baseline"));
    await writeFile(path.join(dest, "actual.txt"), await list(".storybranch/actual"));
    console.error(`evidence ${dest}`);
  }

  process.exitCode = exitCode;
}

async function cleanup(): Promise<void> {
  const id = runId();
  const file = statePath(id);

  if (await Bun.file(file).exists()) {
    const state = JSON.parse(await readFile(file, "utf8")) as RunState;
    killTree(state.storybookPid);

    if (state.reviewPid !== null) {
      killTree(state.reviewPid);
    }

    await Bun.sleep(500);

    if (alive(state.storybookPid)) {
      try {
        process.kill(-state.storybookPid, "SIGKILL");
      } catch {
        process.kill(state.storybookPid, "SIGKILL");
      }
    }

    if (state.reviewPid !== null && alive(state.reviewPid)) {
      try {
        process.kill(-state.reviewPid, "SIGKILL");
      } catch {
        process.kill(state.reviewPid, "SIGKILL");
      }
    }
  }

  await rm(runDir(id), { force: true, recursive: true });
  console.log(`removed ${runDir(id)}`);
  console.log(`evidence kept at ${path.join(evidenceRoot, id)}`);
}

const [action, ...rest] = process.argv.slice(2);

try {
  if (action === "launch") {
    await launch();
  } else if (action === "doctor") {
    await doctor();
  } else if (action === "cli") {
    await cli(rest);
  } else if (action === "cleanup") {
    await cleanup();
  } else {
    console.error("usage: verify.ts <launch|doctor|cli|cleanup>");
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
