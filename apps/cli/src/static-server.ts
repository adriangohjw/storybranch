import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

export async function startStorybookStatic(
  dir: string
): Promise<{ stop: () => void; url: string }> {
  const root = path.resolve(dir);
  const info = await stat(root).catch(() => null);

  if (info === null || !info.isDirectory()) {
    throw new Error(`storybook build directory not found: ${root}`);
  }

  const server = createServer((req, res) => {
    void (async () => {
      try {
        const { url = "/" } = req;
        const { pathname } = new URL(url, "http://127.0.0.1");
        const response = await serveStatic(root, pathname);
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
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    stop: () => {
      server.close();
    },
    url: `http://127.0.0.1:${boundPort(server.address())}`,
  };
}

async function serveStatic(root: string, pathname: string): Promise<Response> {
  let relative: string;

  try {
    relative = decodeURIComponent(pathname).replace(/^\/+/u, "");
  } catch {
    return new Response("not found", { status: 404 });
  }

  if (relative === "" || relative.includes("..")) {
    return new Response("not found", { status: 404 });
  }

  const resolved = path.join(root, relative);

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    return new Response("not found", { status: 404 });
  }

  const meta = await stat(resolved).catch(() => null);

  if (meta === null || !meta.isFile()) {
    return new Response("not found", { status: 404 });
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

  if (extension === ".js" || extension === ".mjs") {
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
    throw new Error("storybook static server failed to bind");
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
