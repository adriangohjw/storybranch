import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { createToken, listRuns } from "~/lib/app.functions";
import { canAdmin } from "~/lib/roles";

export const Route = createFileRoute("/_authed/projects/$projectId")({
  component: ProjectPage,
  loader: async ({ params }) =>
    listRuns({ data: { projectId: params.projectId } }),
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { name, runs } = Route.useLoaderData();
  const router = useRouter();
  const [tokenName, setTokenName] = useState("ci");
  const [token, setToken] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <p className="text-xs text-zinc-500">
        <Link to="/projects">Projects</Link>
      </p>
      <h1 className="mt-2 text-lg font-semibold">{name}</h1>
      <ul className="mt-4 divide-y divide-zinc-800 rounded-md border border-zinc-800">
        {runs.length === 0 ? (
          <li className="px-4 py-6 text-sm text-zinc-500">No runs yet.</li>
        ) : (
          runs.map((run) => (
            <li key={run.id}>
              <Link
                className="block px-4 py-3 text-sm hover:bg-zinc-900"
                params={{ projectId, runId: run.id }}
                to="/projects/$projectId/runs/$runId"
              >
                <span className="font-mono text-xs">
                  {run.commitSha.slice(0, 12)}
                </span>
                <span className="ml-2 text-zinc-400">
                  {run.branch ?? ""}
                  {run.prNumber === null ? "" : ` PR #${run.prNumber}`}
                </span>
                <span className="ml-2 text-zinc-600">{run.createdAt}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
      {canAdmin(user.role) ? (
        <form
          className="mt-8 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              const created = await createToken({
                data: { name: tokenName, projectId },
              });

              setToken(created.token);
              await router.invalidate();
            })();
          }}
        >
          <label className="text-sm text-zinc-400">
            CI token name
            <input
              className="mt-1 block rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              onChange={(event) => {
                setTokenName(event.target.value);
              }}
              value={tokenName}
            />
          </label>
          <button
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            type="submit"
          >
            Create project token
          </button>
        </form>
      ) : null}
      {token === null ? null : (
        <p className="mt-3 font-mono text-xs break-all text-amber-200">
          Copy now; it is not shown again: {token}
        </p>
      )}
    </main>
  );
}
