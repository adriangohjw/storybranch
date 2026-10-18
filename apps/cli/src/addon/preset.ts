import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addonReviewPort, storybranchMiddleware } from "@/addon/server.ts";

export function storybranchBin(presetFile: string): string {
  return path.join(
    path.dirname(fileURLToPath(presetFile)),
    "../../bin/storybranch.js"
  );
}

interface Address {
  port: number;
}

interface StorybookDevServer {
  config: { server: { port?: number } };
  httpServer?: { address: () => Address | string | null } | null;
  middlewares: {
    use: (
      handler: (
        request: IncomingMessage,
        response: ServerResponse,
        next: () => void
      ) => Promise<void>
    ) => void;
  };
}

interface VitePlugin {
  configureServer?: (server: StorybookDevServer) => void;
  name?: string;
}

interface ViteConfig {
  plugins?: (VitePlugin | null | undefined)[];
}

function isListenAddress(
  value: string | Address | null | undefined
): value is Address {
  return typeof value === "object" && value !== null;
}

function devServerUrl(server: StorybookDevServer): string {
  const address = server.httpServer?.address?.();

  const port = isListenAddress(address)
    ? address.port
    : server.config.server.port;

  if (port === undefined) {
    throw new Error("Storybook dev server port is unknown");
  }

  return `http://127.0.0.1:${port}`;
}

export function viteFinal(
  config: ViteConfig,
  options: { configDir: string }
): ViteConfig {
  const plugins = config.plugins ?? [];

  if (plugins.some((plugin) => plugin?.name === "storybranch")) {
    return config;
  }

  const root = path.resolve(options.configDir, "..");
  const reviewPort = addonReviewPort();

  return {
    ...config,
    plugins: [
      ...plugins,
      {
        configureServer(server: StorybookDevServer) {
          const handle = storybranchMiddleware({
            bin: storybranchBin(import.meta.url),
            reviewPort,
            root,
            storybookUrl: () => devServerUrl(server),
          });

          server.middlewares.use(handle);
        },
        name: "storybranch",
      },
    ],
  };
}
