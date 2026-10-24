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
      <div aria-hidden className="swatch-rail" />
      <header className="app-header flex items-center justify-between px-5 py-3 pl-8 text-inherit">
        <Link className="text-sm font-semibold" to="/projects">
          storybranch
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {user.email} · {user.role}
          </span>
          <button
            className="chip-button-quiet"
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
