import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import {
  createToken,
  listRuns,
  listTokens,
  revokeToken,
} from "~/lib/app.functions";
import { canAdmin } from "~/lib/roles";

export const Route = createFileRoute("/_authed/projects_/$projectId")({
  component: ProjectPage,
  loader: async ({ params }) => {
    const [project, tokens] = await Promise.all([
      listRuns({ data: { projectId: params.projectId } }),
      listTokens({ data: { projectId: params.projectId } }),
    ]);

    return { ...project, tokens };
  },
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { name, runs, tokens } = Route.useLoaderData();
  const router = useRouter();
  const [tokenName, setTokenName] = useState("ci");
  const [token, setToken] = useState<string | null>(null);

  const [pendingRevokeTokenId, setPendingRevokeTokenId] = useState<
    string | null
  >(null);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 pl-10">
      <p className="text-ink-soft text-xs">
        <Link to="/projects">Projects</Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
        {name}
      </h1>
      <ul className="divide-line border-line mt-4 divide-y rounded-md border">
        {runs.length === 0 ? (
          <li className="text-ink-soft px-4 py-6 text-sm">No runs yet.</li>
        ) : (
          runs.map((run) => (
            <li key={run.id}>
              <Link
                className="shot-cell hover:bg-pending/30 flex flex-wrap items-center px-4 text-sm"
                params={{ projectId, runId: run.id }}
                to="/projects/$projectId/runs/$runId"
              >
                <span className="text-xs tracking-tight tabular-nums">
                  {run.commitSha.slice(0, 12)}
                </span>
                <span className="text-ink-soft ml-2">
                  {run.branch ?? ""}
                  {run.prNumber === null ? "" : ` PR #${run.prNumber}`}
                </span>
                <span className="text-ink-soft ml-2">{run.createdAt}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
      {canAdmin(user.role) ? (
        <section className="mt-8">
          <h2 className="text-ink text-sm font-semibold">Tokens</h2>
          <ul className="divide-line border-line mt-3 divide-y rounded-md border">
            {tokens.length === 0 ? (
              <li className="text-ink-soft px-4 py-6 text-sm">
                No tokens yet.
              </li>
            ) : (
              tokens.map((item) => (
                <li
                  className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
                  key={item.id}
                >
                  <span>{item.name}</span>
                  {item.prefix === null || item.suffix === null ? null : (
                    <span className="text-ink-soft text-xs tabular-nums">
                      sbp_{item.prefix}…{item.suffix}
                    </span>
                  )}
                  <span className="text-ink-soft text-xs tabular-nums">
                    {item.createdAt}
                  </span>
                  {pendingRevokeTokenId === item.id ? (
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <span className="text-ink-soft text-xs">
                        Revoke {item.name}?
                      </span>
                      <button
                        className="bg-ink text-paper rounded-md px-3 py-1 text-sm font-medium"
                        onClick={() => {
                          void (async () => {
                            await revokeToken({
                              data: { projectId, tokenId: item.id },
                            });
                            setPendingRevokeTokenId(null);
                            await router.invalidate();
                          })();
                        }}
                        type="button"
                      >
                        Confirm
                      </button>
                      <button
                        className="border-line rounded-md border px-3 py-1 text-sm"
                        onClick={() => {
                          setPendingRevokeTokenId(null);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="border-line ml-auto rounded-md border px-3 py-1 text-sm"
                      onClick={() => {
                        setPendingRevokeTokenId(item.id);
                      }}
                      type="button"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
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
            <label className="text-ink-soft text-sm">
              CI token name
              <input
                className="border-line bg-sheet text-ink mt-1 block rounded-md border px-3 py-2 text-sm"
                onChange={(event) => {
                  setTokenName(event.target.value);
                }}
                value={tokenName}
              />
            </label>
            <button
              className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium"
              type="submit"
            >
              Create project token
            </button>
          </form>
          {token === null ? null : (
            <p className="text-ink mt-3 text-xs break-all tabular-nums">
              Copy now; it is not shown again: {token}
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
