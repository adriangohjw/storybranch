import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { acceptAllAttention, acceptEntry } from "@storybranch/core/store";
import { readReport, reportHasAttention } from "@storybranch/report";
import type { Report } from "@storybranch/report";

const PUBLIC_DIR = path.join(import.meta.dirname, "..", "review", "public");

export interface ReviewServerOptions {
  once: boolean;
  port: number;
  root: string;
}

export async function reviewUiBuilt(): Promise<boolean> {
  return await fileExists(path.join(PUBLIC_DIR, "index.html"));
}

export async function assertReviewUiBuilt(): Promise<void> {
  if (!(await reviewUiBuilt())) {
    throw new Error("review UI is not built");
  }
}

export async function startReviewServer(
  options: ReviewServerOptions
): Promise<{ done: Promise<void>; stop: () => void; url: string }> {
  await assertReviewUiBuilt();
  const report = await readReport(options.root);
  let active = report;
  let resolveDone: (() => void) | undefined;

  // oxlint-disable-next-line promise/avoid-new -- shutdown latch for node:http
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const server = createServer((req, res) => {
    void (async () => {
      try {
        const response = await handle(
          options,
          () => active,
          (next) => {
            active = next;
          },
          server,
          resolveDone,
          req
        );

        await writeResponse(res, response);
      } catch {
        if (!res.headersSent) {
          res.writeHead(500);
        }

        res.end();
      }
    })();
  });

  // oxlint-disable-next-line promise/avoid-new -- listen error is delivered on the server
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const port = boundPort(server.address());

  if (options.once && !reportHasAttention(active)) {
    setTimeout(() => {
      server.close();
      resolveDone?.();
    }, 0);
  }

  return {
    done,
    stop: () => {
      server.close();
      resolveDone?.();
    },
    url: `http://127.0.0.1:${port}`,
  };
}

async function handle(
  options: ReviewServerOptions,
  current: () => Report,
  setCurrent: (report: Report) => void,
  server: Server,
  resolveDone: (() => void) | undefined,
  req: IncomingMessage
): Promise<Response> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (url.pathname === "/api/report") {
    return json(current());
  }

  if (url.pathname === "/api/accept-all" && req.method === "POST") {
    const next = await acceptAllAttention(options.root);
    setCurrent(next);
    maybeStopOnce(options, next, server, resolveDone);

    return json(next);
  }

  const accept = /^\/api\/accept\/(?<filename>[^/]+)$/u.exec(url.pathname);

  if (accept !== null && req.method === "POST") {
    const filename = decodeURIComponent(accept.groups?.filename ?? "");
    const next = await acceptEntry(options.root, filename);
    setCurrent(next);
    maybeStopOnce(options, next, server, resolveDone);

    return json(next);
  }

  const image =
    /^\/images\/(?<kind>baseline|actual|diff)\/(?<filename>[^/]+)$/u.exec(
      url.pathname
    );

  if (image !== null) {
    const kind = image.groups?.kind;
    const filename = decodeURIComponent(image.groups?.filename ?? "");
    const entry = current().entries.find((item) => item.filename === filename);

    if (entry === undefined) {
      return new Response("not found", { status: 404 });
    }

    const filePath = imagePath(entry, kind);

    if (filePath === undefined || !(await fileExists(filePath))) {
      return new Response("not found", { status: 404 });
    }

    return new Response(await readFile(filePath), {
      headers: { "content-type": "image/png" },
    });
  }

  const staticResponse = await servePublic(url.pathname);

  if (staticResponse !== null) {
    return staticResponse;
  }

  return new Response("not found", { status: 404 });
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
  server: Server,
  resolveDone: (() => void) | undefined
): void {
  if (options.once && !reportHasAttention(report)) {
    setTimeout(() => {
      server.close();
      resolveDone?.();
    }, 100);
  }
}

function json(body: Report): Response {
  return new Response(`${JSON.stringify(body)}\n`, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function servePublic(pathname: string): Promise<Response | null> {
  const relative =
    pathname === "/" ? "index.html" : pathname.replace(/^\//u, "");

  if (relative.includes("..")) {
    return null;
  }

  const resolved = path.join(PUBLIC_DIR, relative);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    return null;
  }

  if (!(await fileExists(resolved))) {
    return null;
  }

  return new Response(await readFile(resolved), {
    headers: { "content-type": contentType(resolved) },
  });
}

function contentType(file: string): string {
  const extension = path.extname(file);

  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }

  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }

  if (extension === ".ico") {
    return "image/x-icon";
  }

  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }

  if (extension === ".json" || extension === ".map") {
    return "application/json; charset=utf-8";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  if (extension === ".woff") {
    return "font/woff";
  }

  if (extension === ".woff2") {
    return "font/woff2";
  }

  return "application/octet-stream";
}

function boundPort(address: ReturnType<Server["address"]>): number {
  if (address === null) {
    throw new Error("review server failed to bind");
  }

  // SAFETY: listen() was called with a TCP port, so this is AddressInfo, not a pipe path.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (address as AddressInfo).port;
}

async function writeResponse(
  res: ServerResponse,
  response: Response
): Promise<void> {
  const headers: Record<string, string> = {};

  for (const [key, value] of response.headers) {
    headers[key] = value;
  }

  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
}
