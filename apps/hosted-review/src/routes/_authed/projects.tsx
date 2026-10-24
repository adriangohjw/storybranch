import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import {
  createProject,
  inviteUser,
  listInvites,
  listProjects,
} from "~/lib/app.functions";
import { canAdmin } from "~/lib/roles";

export const Route = createFileRoute("/_authed/projects")({
  component: ProjectsPage,
  loader: async () => ({
    invites: await listInvites(),
    projects: await listProjects(),
  }),
});

function ProjectsPage() {
  const { user } = Route.useRouteContext();
  const { invites, projects } = Route.useLoaderData();
  const router = useRouter();
  const admin = canAdmin(user.role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="text-lg font-semibold">Projects</h1>
      <ul className="mt-4 divide-y divide-zinc-800 rounded-md border border-zinc-800">
        {projects.length === 0 ? (
          <li className="px-4 py-6 text-sm text-zinc-500">No projects yet.</li>
        ) : (
          projects.map((project) => (
            <li key={project.id}>
              <Link
                className="block px-4 py-3 text-sm hover:bg-zinc-900"
                params={{ projectId: project.id }}
                to="/projects/$projectId"
              >
                {project.name}
              </Link>
            </li>
          ))
        )}
      </ul>
      {admin ? (
        <form
          className="mt-6 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              await createProject({ data: { name } });
              setName("");
              await router.invalidate();
            })();
          }}
        >
          <input
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="New project"
            value={name}
          />
          <button
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            type="submit"
          >
            Create
          </button>
        </form>
      ) : null}
      {admin ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-200">Team</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Default invite role is member. Org-wide roles apply to every
            project.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            {invites.map((invite) => (
              <li key={invite.email}>
                {invite.email} · {invite.role}
              </li>
            ))}
          </ul>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                await inviteUser({ data: { email, role } });
                setEmail("");
                await router.invalidate();
              })();
            }}
          >
            <input
              className="min-w-48 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder="email"
              type="email"
              value={email}
            />
            <select
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm"
              onChange={(event) => {
                setRole(event.target.value);
              }}
              value={role}
            >
              <option value="member">member</option>
              <option value="approver">approver</option>
              <option value="admin">admin</option>
            </select>
            <button
              className="rounded-md border border-zinc-600 px-3 py-2 text-sm"
              type="submit"
            >
              Invite
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
