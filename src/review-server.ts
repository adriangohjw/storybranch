import path from "node:path";

import {
  acceptAllAttention,
  acceptEntry,
  readReport,
  reportHasAttention,
  type Report,
} from "./report.ts";

const PUBLIC_DIR = path.join(import.meta.dir, "review", "public");

export interface ReviewServerOptions {
  once: boolean;
  port: number;
  root: string;
}

export async function reviewUiBuilt(): Promise<boolean> {
  return await Bun.file(path.join(PUBLIC_DIR, "index.html")).exists();
}

export async function assertReviewUiBuilt(): Promise<void> {
  if (!(await reviewUiBuilt())) {
    throw new Error("review UI is not built; run `bun run build:review`");
  }
}

export async function startReviewServer(
  options: ReviewServerOptions
): Promise<{ done: Promise<void>; stop: () => void; url: string }> {
  await assertReviewUiBuilt();
  const report = await readReport(options.root);
  let active = report;
  let resolveDone: (() => void) | undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: options.port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/api/report") {
        return json(active);
      }
      if (url.pathname === "/api/accept-all" && request.method === "POST") {
        active = await acceptAllAttention(options.root);
        maybeStopOnce(options, active, server, resolveDone);
        return json(active);
      }
      const accept = /^\/api\/accept\/(?<filename>[^/]+)$/u.exec(url.pathname);
      if (accept !== null && request.method === "POST") {
        const filename = decodeURIComponent(accept.groups?.filename ?? "");
        active = await acceptEntry(options.root, filename);
        maybeStopOnce(options, active, server, resolveDone);
        return json(active);
      }
      const image = /^\/images\/(?<kind>baseline|actual|diff)\/(?<filename>[^/]+)$/u.exec(
        url.pathname
      );
      if (image !== null) {
        const kind = image.groups?.kind;
        const filename = decodeURIComponent(image.groups?.filename ?? "");
        const entry = active.entries.find((item) => item.filename === filename);
        if (entry === undefined) {
          return new Response("not found", { status: 404 });
        }
        const filePath = imagePath(entry, kind);
        if (filePath === undefined) {
          return new Response("not found", { status: 404 });
        }
        const file = Bun.file(filePath);
        if (!(await file.exists())) {
          return new Response("not found", { status: 404 });
        }
        return new Response(file, {
          headers: { "content-type": "image/png" },
        });
      }
      const staticResponse = await servePublic(url.pathname);
      if (staticResponse !== null) {
        return staticResponse;
      }
      return new Response("not found", { status: 404 });
    },
  });

  if (options.once && !reportHasAttention(active)) {
    setTimeout(() => {
      server.stop();
      resolveDone?.();
    }, 0);
  }

  return {
    done,
    stop: () => {
      server.stop();
      resolveDone?.();
    },
    url: `http://127.0.0.1:${server.port}`,
  };
}

function imagePath(
  entry: Report["entries"][number],
  kind: string | undefined
): string | undefined {
  if (kind === "baseline") {
    return entry.baselinePath;
  }
  if (kind === "actual") {
    return entry.actualPath;
  }
  if (kind === "diff") {
    return entry.diffPath;
  }
  return undefined;
}

function maybeStopOnce(
  options: ReviewServerOptions,
  report: Report,
  server: ReturnType<typeof Bun.serve>,
  resolveDone: (() => void) | undefined
): void {
  if (options.once && !reportHasAttention(report)) {
    setTimeout(() => {
      server.stop();
      resolveDone?.();
    }, 100);
  }
}

function json(body: unknown): Response {
  return new Response(`${JSON.stringify(body)}\n`, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function servePublic(pathname: string): Promise<Response | null> {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//u, "");
  if (relative.includes("..")) {
    return null;
  }
  const resolved = path.join(PUBLIC_DIR, relative);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    return null;
  }
  const file = Bun.file(resolved);
  if (!(await file.exists())) {
    return null;
  }
  return new Response(file);
}
