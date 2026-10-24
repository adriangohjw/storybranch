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
    <main className="mx-auto max-w-3xl px-5 py-8 pl-10">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        Projects
      </h1>
      <ul className="divide-line border-line mt-6 divide-y border-y">
        {projects.length === 0 ? (
          <li className="text-ink-soft px-4 py-6 text-sm">No projects yet.</li>
        ) : (
          projects.map((project) => (
            <li key={project.id}>
              <Link
                className="shot-cell hover:bg-pending/30 flex items-center px-4 text-sm"
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
            className="border-line bg-sheet flex-1 rounded-md border px-3 py-2 text-sm"
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="New project"
            value={name}
          />
          <button
            className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium"
            type="submit"
          >
            Create
          </button>
        </form>
      ) : null}
      {admin ? (
        <section className="mt-10">
          <h2 className="text-ink text-sm font-semibold">Team</h2>
          <p className="text-ink-soft mt-1 text-xs">
            Default invite role is member. Org-wide roles apply to every
            project.
          </p>
          <ul className="text-ink-soft mt-3 space-y-1 text-sm">
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
              className="border-line bg-sheet min-w-48 flex-1 rounded-md border px-3 py-2 text-sm"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder="email"
              type="email"
              value={email}
            />
            <select
              className="border-line bg-sheet rounded-md border px-2 py-2 text-sm"
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
              className="border-line rounded-md border px-3 py-2 text-sm"
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
