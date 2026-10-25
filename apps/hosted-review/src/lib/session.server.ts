import { getRequestHeaders } from "@tanstack/react-start/server";

import { getAuth } from "~/lib/auth.server";
import { userRole } from "~/lib/db.server";
import type { Role } from "~/lib/roles";

export interface SessionUser {
  email: string;
  id: string;
  name: string;
  role: Role;
}

export async function loadSessionUser(): Promise<SessionUser | null> {
  const auth = await getAuth();

  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  if (session === null) {
    return null;
  }

  return {
    email: session.user.email,
    id: session.user.id,
    name: session.user.name,
    role: await userRole(session.user.id),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await loadSessionUser();

  if (user === null) {
    throw new Error("Unauthorized");
  }

  return user;
}
