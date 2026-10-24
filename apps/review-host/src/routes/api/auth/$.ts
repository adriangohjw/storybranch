import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "~/lib/auth.server";
import { ensureSchema } from "~/lib/db.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});

async function handleAuth({ request }: { request: Request }) {
  await ensureSchema();

  return getAuth().handler(request);
}
