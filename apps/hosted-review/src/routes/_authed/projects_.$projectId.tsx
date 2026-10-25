import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { PageError, PagePending } from "~/components/page-state";
import { ProofKey, ProofStrip } from "~/components/proof-strip";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  createToken,
  listRuns,
  listTokens,
  revokeToken,
} from "~/lib/app.functions";
import type { RunRow } from "~/lib/app.functions";
import { formatWhen, shortSha } from "~/lib/format";
import { runFinding } from "~/lib/proof";
import { canAdmin } from "~/lib/roles";

const POST_COMMAND = `storybranch test --build --exit-once \\
  --project-token "$STORYBRANCH_PROJECT_TOKEN" \\
  --api-url "$STORYBRANCH_API_URL"`;

export const Route = createFileRoute("/_authed/projects_/$projectId")({
  component: ProjectPage,
  errorComponent: ({ reset }) => (
    <PageError onRetry={reset} what="Couldn't load this project." />
  ),
  loader: async ({ params }) => {
    const [project, tokens] = await Promise.all([
      listRuns({ data: { projectId: params.projectId } }),
      listTokens({ data: { projectId: params.projectId } }),
    ]);

    return { ...project, tokens };
  },
  pendingComponent: PagePending,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { name, runs, tokens } = Route.useLoaderData();
  const router = useRouter();
  const admin = canAdmin(user.role);
  const [tokenName, setTokenName] = useState("ci");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [pendingRevokeTokenId, setPendingRevokeTokenId] = useState<
    string | null
  >(null);

  const [latest] = runs;
  const waiting = latest?.proof?.waiting ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-muted-foreground text-sm">
            {runFinding(latest?.proof ?? null, runs.length > 0)}
          </p>
        </div>
        {latest !== undefined && waiting > 0 ? (
          <Button asChild>
            <Link
              params={{ projectId, runId: latest.id }}
              to="/projects/$projectId/runs/$runId"
            >
              Review latest
            </Link>
          </Button>
        ) : null}
      </div>

      {runs.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-sm">
          <p>No runs yet.</p>
          <p className="mt-1">
            Create a project token, then post a proof from CI.
          </p>
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="text-right">Waiting</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <RunLine key={run.id} projectId={projectId} run={run} />
              ))}
            </TableBody>
          </Table>
          <ProofKey />
        </div>
      )}

      {admin ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">CI access</h2>
          </CardHeader>
          <CardContent className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Tokens</h3>
              {tokens.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  No tokens yet.
                </p>
              ) : (
                <ul>
                  {tokens.map((item) => (
                    <li
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t py-3 text-sm"
                      key={item.id}
                    >
                      <span>{item.name}</span>
                      <code className="text-xs tabular-nums">
                        sbp_{item.prefix}…{item.suffix}
                      </code>
                      <span className="text-muted-foreground text-xs">
                        {formatWhen(item.createdAt)}
                      </span>
                      {pendingRevokeTokenId === item.id ? (
                        <>
                          <span className="text-muted-foreground text-xs">
                            Revoke {item.name}?
                          </span>
                          <Button
                            onClick={() => {
                              void (async () => {
                                await revokeToken({
                                  data: { projectId, tokenId: item.id },
                                });
                                setPendingRevokeTokenId(null);
                                await router.invalidate();
                              })();
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Confirm
                          </Button>
                          <Button
                            onClick={() => {
                              setPendingRevokeTokenId(null);
                            }}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => {
                            setPendingRevokeTokenId(item.id);
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Revoke
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="mt-4 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void (async () => {
                    const created = await createToken({
                      data: { name: tokenName, projectId },
                    });

                    setToken(created.token);
                    setCopied(false);
                    await router.invalidate();
                  })();
                }}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="token-name">Token name</Label>
                  <Input
                    id="token-name"
                    onChange={(event) => {
                      setTokenName(event.target.value);
                    }}
                    value={tokenName}
                  />
                </div>
                <Button
                  type="submit"
                  variant={
                    waiting === 0 && tokens.length === 0 ? "default" : "outline"
                  }
                >
                  Create token
                </Button>
              </form>
              {token === null ? null : (
                <div className="bg-muted mt-3 space-y-2 rounded-md p-3 text-sm">
                  <p>Copy it now. It is not shown again.</p>
                  <p className="break-all tabular-nums">{token}</p>
                  <Button
                    onClick={() => {
                      void (async () => {
                        await navigator.clipboard.writeText(token);
                        setCopied(true);
                      })();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {copied ? "Copied" : "Copy token"}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Post a run</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Set STORYBRANCH_PROJECT_TOKEN and STORYBRANCH_API_URL on the CI
                job, then run:
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
                {POST_COMMAND}
              </pre>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function RunLine({ projectId, run }: { projectId: string; run: RunRow }) {
  const waiting = run.proof?.waiting ?? 0;

  return (
    <TableRow>
      <TableCell>
        <Link
          className="font-medium hover:underline"
          params={{ projectId, runId: run.id }}
          to="/projects/$projectId/runs/$runId"
        >
          {run.prNumber === null
            ? (run.branch ?? shortSha(run.commitSha))
            : `PR ${run.prNumber.toString()}`}
        </Link>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {run.branch ?? "No branch"}
          <span className="tabular-nums" title={run.commitSha}>
            {" "}
            · {shortSha(run.commitSha)}
          </span>
        </span>
        <ProofStrip proof={run.proof} />
      </TableCell>
      <TableCell>{formatWhen(run.createdAt)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {run.proof === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          waiting
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button asChild size="sm" variant="ghost">
          <Link
            params={{ projectId, runId: run.id }}
            to="/projects/$projectId/runs/$runId"
          >
            Open
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
