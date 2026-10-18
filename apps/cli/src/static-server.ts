import { stat } from "node:fs/promises";
import path from "node:path";

export async function startStorybookStatic(
  dir: string
): Promise<{ stop: () => void; url: string }> {
  const root = path.resolve(dir);
  const info = await stat(root).catch(() => null);

  if (info === null || !info.isDirectory()) {
    throw new Error(`storybook build directory not found: ${root}`);
  }

  const server = Bun.serve({
    async fetch(request) {
      return await serveStatic(root, new URL(request.url).pathname);
    },
    hostname: "127.0.0.1",
    port: 0,
  });

  return {
    stop: () => {
      void server.stop(true);
    },
    url: `http://127.0.0.1:${server.port}`,
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

  const file = Bun.file(resolved);
  const exists = await file.exists();

  if (!exists) {
    return new Response("not found", { status: 404 });
  }

  const meta = await file.stat();

  if (meta.isDirectory()) {
    return new Response("not found", { status: 404 });
  }

  return new Response(file);
}
