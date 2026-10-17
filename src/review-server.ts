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

export async function startReviewServer(
  options: ReviewServerOptions
): Promise<{ done: Promise<void>; stop: () => void; url: string }> {
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
      if (url.pathname === "/") {
        return serveFile(path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8");
      }
      if (url.pathname === "/app.js") {
        return serveFile(path.join(PUBLIC_DIR, "app.js"), "text/javascript; charset=utf-8");
      }
      if (url.pathname === "/styles.css") {
        return serveFile(path.join(PUBLIC_DIR, "styles.css"), "text/css; charset=utf-8");
      }
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

async function serveFile(filePath: string, contentType: string): Promise<Response> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response("not found", { status: 404 });
  }
  return new Response(file, { headers: { "content-type": contentType } });
}
