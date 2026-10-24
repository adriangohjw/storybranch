import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "~/lib/auth.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});

async function handleAuth({ request }: { request: Request }) {
  const auth = await getAuth();

  return auth.handler(request);
}
