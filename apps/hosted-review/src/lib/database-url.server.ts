import { hyperdriveConnectionString } from "~/lib/cloudflare.server";
import { env } from "~/lib/env";

export function resolveDatabaseUrl(): string {
  const hyperdrive = hyperdriveConnectionString();

  if (hyperdrive !== undefined && hyperdrive.length > 0) {
    return hyperdrive;
  }

  if (env.DATABASE_URL !== undefined) {
    return env.DATABASE_URL;
  }

  throw new Error(
    "No database URL: set DATABASE_URL or bind Hyperdrive as HYPERDRIVE"
  );
}
