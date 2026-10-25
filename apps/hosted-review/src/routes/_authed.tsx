import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { Shell } from "~/components/shell";
import { listProjects } from "~/lib/app.functions";
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
  loader: async () => ({
    projects: await listProjects(),
  }),
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const { projects } = Route.useLoaderData();

  return (
    <Shell projects={projects} user={user}>
      <Outlet />
    </Shell>
  );
}
