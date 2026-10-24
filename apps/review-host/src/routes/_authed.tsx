import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";
import { getSessionUser } from "~/lib/auth.functions";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const user = await getSessionUser();

    if (user === null) {
      throw redirect({ to: "/login" });
    }

    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();

  return (
    <div>
      <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
        <Link className="text-sm font-semibold" to="/projects">
          storybranch
        </Link>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>
            {user.email} · {user.role}
          </span>
          <button
            className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-200"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = "/login";
                  },
                },
              });
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
