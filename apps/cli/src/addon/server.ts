import { execFile } from "node:child_process";
import { stat, readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { promisify } from "node:util";

import {
  failureLine,
  isReportDocument,
  reviewBuildError,
  reviewUrlFromOutput,
  storyStatuses,
  summary,
} from "@/addon/status.ts";
import type { AddonPayload, StoryVisualStatus } from "@/addon/status.ts";

interface ExecFailure {
  code?: number;
  message?: string;
  stderr?: string;
  stdout?: string;
}

function isExecFailure(value: unknown): value is ExecFailure {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (
    "code" in value &&
    value.code !== undefined &&
    typeof value.code !== "number"
  ) {
    return false;
  }

  if (
    "message" in value &&
    value.message !== undefined &&
    typeof value.message !== "string"
  ) {
    return false;
  }

  if (
    "stderr" in value &&
    value.stderr !== undefined &&
    typeof value.stderr !== "string"
  ) {
    return false;
  }

  if (
    "stdout" in value &&
    value.stdout !== undefined &&
    typeof value.stdout !== "string"
  ) {
    return false;
  }

  return true;
}

function failureText(failed: ExecFailure): string {
  if (failed.stderr !== undefined && failed.stderr !== "") {
    return failed.stderr;
  }

  if (failed.message !== undefined && failed.message !== "") {
    return failed.message;
  }

  return "storybranch failed";
}

// oxlint-disable-next-line typescript/strict-void-return -- promisify adapts execFile's callback
const execFileAsync = promisify(execFile);

export const ADDON_ROUTE = "/__storybranch";
export const DEFAULT_REVIEW_PORT = 4321;

export interface RunResult {
  code: number;
  stderr: string;
  stdout: string;
}

interface ReportFile {
  mtimeMs: number;
  stories: StoryVisualStatus[];
}

export interface AddonHandlers {
  readReport: () => Promise<ReportFile | null>;
  reviewPort: number;
  run: (input: { port: number; url: string }) => Promise<RunResult>;
  storybookUrl: () => string;
}

export function storybookUrlFromPort(
  port: number | undefined,
  fallback: string
): string {
  if (port === undefined) {
    return fallback;
  }

  return `http://127.0.0.1:${port}`;
}

export function addonReviewPort(
  env: string | undefined = process.env.STORYBRANCH_PORT
): number {
  if (env === undefined || env === "") {
    return DEFAULT_REVIEW_PORT;
  }

  const port = Number(env);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`invalid STORYBRANCH_PORT: ${env}`);
  }

  return port;
}

export async function readReportFile(root: string): Promise<ReportFile | null> {
  const file = path.join(root, ".storybranch", "report.json");

  try {
    const [text, info] = await Promise.all([
      readFile(file, "utf-8"),
      stat(file),
    ]);

    const parsed: unknown = JSON.parse(text);

    if (!isReportDocument(parsed)) {
      return null;
    }

    return { mtimeMs: info.mtimeMs, stories: storyStatuses(parsed.entries) };
  } catch {
    return null;
  }
}

export async function runStorybranch(input: {
  bin: string;
  port: number;
  root: string;
  url: string;
}): Promise<RunResult> {
  const args = [
    input.bin,
    "test",
    "--url",
    input.url,
    "--review",
    "--port",
    String(input.port),
    "--cwd",
    input.root,
  ];

  try {
    const { stderr, stdout } = await execFileAsync("bun", args, {
      cwd: input.root,
      encoding: "utf-8",
      env: { ...process.env, STORYBRANCH_ROOT: input.root },
      maxBuffer: 16 * 1024 * 1024,
    });

    return { code: 0, stderr: stderr ?? "", stdout: stdout ?? "" };
  } catch (error) {
    if (!isExecFailure(error)) {
      return { code: 1, stderr: "storybranch failed", stdout: "" };
    }

    return {
      code: error.code ?? 1,
      stderr: failureText(error),
      stdout: error.stdout ?? "",
    };
  }
}

export function createAddonApi(handlers: AddonHandlers) {
  let failure: string | null = null;
  let reviewUrl: string | null = null;
  let running = false;
  let stories: StoryVisualStatus[] = [];

  const payload = (): AddonPayload => ({
    error: failure,
    reviewUrl,
    running,
    stories,
    summary: summary(stories),
  });

  return {
    async handle(
      method: string
    ): Promise<{ body: AddonPayload; status: number }> {
      if (method === "GET") {
        if (!running) {
          const file = await handlers.readReport();
          stories = file?.stories ?? [];
          failure = null;
        }

        return { body: payload(), status: 200 };
      }

      if (method !== "POST") {
        return { body: payload(), status: 405 };
      }

      // ponytail: one capture at a time per dev server. Queue if overlapping runs matter.
      if (running) {
        return { body: payload(), status: 409 };
      }

      running = true;
      failure = null;
      const before = await handlers.readReport();

      try {
        const { code, stderr, stdout } = await handlers.run({
          port: handlers.reviewPort,
          url: handlers.storybookUrl(),
        });

        const after = await handlers.readReport();

        const updated =
          after !== null &&
          (before === null || after.mtimeMs !== before.mtimeMs);

        if ((code === 0 || code === 1) && updated && after !== null) {
          const { stories: nextStories } = after;
          stories = nextStories;
          const url = reviewUrlFromOutput(stdout);

          if (url !== null) {
            reviewUrl = url;
          }

          failure = url === null ? reviewBuildError(stderr) : null;
          running = false;

          return { body: payload(), status: 200 };
        }

        failure = failureLine(stderr);
        running = false;

        return { body: payload(), status: 500 };
      } catch (error) {
        failure =
          error instanceof Error ? error.message : "visual tests failed";
        running = false;

        return { body: payload(), status: 500 };
      }
    },
  };
}

export function storybranchMiddleware(options: {
  bin: string;
  reviewPort: number;
  root: string;
  storybookUrl: () => string;
}) {
  let connectedPort: number | undefined;

  const api = createAddonApi({
    readReport: async () => await readReportFile(options.root),
    reviewPort: options.reviewPort,
    run: async ({ port, url }) =>
      await runStorybranch({ bin: options.bin, port, root: options.root, url }),
    storybookUrl: () =>
      storybookUrlFromPort(connectedPort, options.storybookUrl()),
  });

  return async function storybranch(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ): Promise<void> {
    const [pathname] = (request.url ?? "").split("?");

    if (pathname !== ADDON_ROUTE) {
      next();

      return;
    }

    connectedPort = request.socket.localPort;

    try {
      const { body, status } = await api.handle(request.method ?? "GET");
      response.statusCode = status;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(body));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "visual tests failed";

      response.statusCode = 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          error: message,
          reviewUrl: null,
          running: false,
          stories: [],
          summary: "No report yet",
        } satisfies AddonPayload)
      );
    }
  };
}
