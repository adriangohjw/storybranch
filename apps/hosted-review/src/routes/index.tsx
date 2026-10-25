import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSessionUser } from "~/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await getSessionUser();

    throw redirect({ to: user === null ? "/login" : "/projects" });
  },
});
