import { createServerFn } from "@tanstack/react-start";

import { loadSessionUser } from "~/lib/session.server";
import type { SessionUser } from "~/lib/session.server";

export type { SessionUser };

export const getSessionUser = createServerFn({ method: "GET" }).handler(
  async () => loadSessionUser()
);
