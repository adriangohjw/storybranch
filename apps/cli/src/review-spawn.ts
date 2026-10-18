import path from "node:path";

import { startReviewServer } from "@/review-server.ts";

export const DEFAULT_REVIEW_PORT = 4321;

export function reviewPortFromEnv(): number {
  const raw = process.env.STORYBRANCH_PORT;

  if (raw === undefined || raw === "") {
    return DEFAULT_REVIEW_PORT;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`invalid STORYBRANCH_PORT: ${raw}`);
  }

  return port;
}

function browserOpenCommand(url: string): string[] {
  const { platform } = process;

  if (platform === "darwin") {
    return ["open", url];
  }

  if (platform === "win32") {
    return ["cmd", "/c", "start", "", url];
  }

  return ["xdg-open", url];
}

export function openBrowser(url: string): void {
  Bun.spawn(browserOpenCommand(url), { stderr: "ignore", stdout: "ignore" });
}

export function spawnDetachedReview(
  root: string,
  port: number,
  once: boolean
): void {
  const cli = path.join(import.meta.dir, "cli.ts");
  const args = ["bun", cli, "review", "--port", String(port)];

  if (once) {
    args.push("--once");
  }

  const proc = Bun.spawn(args, {
    cwd: root,
    detached: true,
    env: { ...process.env, STORYBRANCH_ROOT: root },
    stderr: "ignore",
    stdin: "ignore",
    stdout: "ignore",
  });

  proc.unref();
}

export async function runForegroundReview(options: {
  once: boolean;
  open: boolean;
  port: number;
  root: string;
}): Promise<number> {
  try {
    const { done, stop, url } = await startReviewServer({
      once: options.once,
      port: options.port,
      root: options.root,
    });

    console.log(`storybranch review at ${url}`);

    if (options.open) {
      openBrowser(url);
    }

    const onSignal = () => {
      stop();
    };

    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    await done;

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("EADDRINUSE") ||
      message.includes("address already in use")
    ) {
      console.error(
        `review port ${options.port} is in use; try --port or STORYBRANCH_PORT`
      );

      return 1;
    }

    console.error(message);

    return 1;
  }
}
