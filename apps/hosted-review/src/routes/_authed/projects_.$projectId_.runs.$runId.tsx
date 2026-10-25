import type { ReportEntry } from "@storybranch/report";
import { BuildSummary } from "@storybranch/review-ui/build-summary";
import { ComparisonViewer } from "@storybranch/review-ui/comparison-viewer";
import { matchesFilter } from "@storybranch/review-ui/lib/report-ui";
import { ShotList } from "@storybranch/review-ui/shot-list";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PageError, PagePending } from "~/components/page-state";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  acceptSnapshot,
  addComment,
  loadRun,
  requestChanges,
} from "~/lib/app.functions";
import { formatWhen, shortSha } from "~/lib/format";
import { runFinding, summarizeProof } from "~/lib/proof";
import { canReview } from "~/lib/roles";
import { cn } from "~/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "changes_requested", label: "Changes requested" },
  { id: "accepted", label: "Accepted" },
  { id: "unchanged", label: "Unchanged" },
] as const;

export const Route = createFileRoute(
  "/_authed/projects_/$projectId_/runs/$runId"
)({
  component: RunPage,
  errorComponent: ({ reset }) => (
    <PageError onRetry={reset} what="Couldn't load this run." />
  ),
  loader: async ({ params }) =>
    loadRun({
      data: { projectId: params.projectId, runId: params.runId },
    }),
  pendingComponent: PagePending,
});

function RunPage() {
  const { projectId, runId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const data = Route.useLoaderData();
  const router = useRouter();
  const reviewer = canReview(user.role);
  const [filter, setFilter] = useState("all");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [pane, setPane] = useState<"list" | "detail">("list");
  const imagePrefix = `/api/projects/${projectId}/runs/${runId}`;
  const proof = summarizeProof(data.report.entries, data.review);

  const title = runTitle(
    data.run.branch,
    data.run.commitSha,
    data.run.prNumber
  );

  const refresh = () => {
    void router.invalidate();
  };

  const acceptShot = async (filename: string) => {
    await acceptSnapshot({ data: { filename, projectId, runId } });
  };

  const visible = useMemo(
    () =>
      data.report.entries.filter((entry) => {
        if (filter === "changes_requested") {
          return (
            entry.filename !== undefined &&
            data.review[entry.filename] === "changes_requested"
          );
        }

        if (filter === "accepted") {
          return (
            entry.filename !== undefined &&
            data.review[entry.filename] === "accepted"
          );
        }

        return matchesFilter(entry, filter);
      }),
    [data.report.entries, data.review, filter]
  );

  const activeFilename = useMemo(() => {
    if (
      selectedFilename !== null &&
      visible.some((entry) => entry.filename === selectedFilename)
    ) {
      return selectedFilename;
    }

    return visible[0]?.filename ?? null;
  }, [selectedFilename, visible]);

  const selected: ReportEntry | null =
    visible.find((entry) => entry.filename === activeFilename) ?? null;

  const selectedKey = selected?.filename;

  const reviewState =
    selectedKey === undefined ? undefined : data.review[selectedKey];

  const comments =
    selectedKey === undefined ? [] : (data.comments[selectedKey] ?? []);

  return (
    <div>
      <div className="space-y-4 px-6 pt-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {runFinding(proof, true, "This run")} Posted{" "}
            {formatWhen(data.run.createdAt)}.
          </p>
        </div>
        <BuildSummary report={data.report} />
        <Tabs
          onValueChange={(value) => {
            if (FILTERS.some((item) => item.id === value)) {
              setFilter(value);
            }
          }}
          value={filter}
        >
          <TabsList>
            {FILTERS.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="mt-4 grid items-start md:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          className={cn("px-4 pb-6", pane === "detail" && "max-md:hidden")}
        >
          <h2 className="mb-2 text-sm font-semibold">Shots</h2>
          <ShotList
            acceptShot={acceptShot}
            entries={visible}
            onAccept={refresh}
            onSelect={(filename) => {
              setSelectedFilename(filename);
              setPane("detail");
            }}
            selectedFilename={activeFilename}
            showAccept={false}
          />
        </aside>
        <section
          className={cn("px-6 pb-6", pane === "list" && "max-md:hidden")}
        >
          <Button
            className="mb-3 md:hidden"
            onClick={() => {
              setPane("list");
            }}
            type="button"
            variant="outline"
          >
            All shots
          </Button>
          <ComparisonViewer
            acceptShot={acceptShot}
            entry={selected}
            filter={filter}
            imagePrefix={imagePrefix}
            onAccept={refresh}
            report={data.report}
            showAccept={reviewer}
            visibleCount={visible.length}
          />
          {selectedKey === undefined ? null : (
            <div className="mt-6 space-y-3">
              <Badge variant={reviewVariant(reviewState)}>
                {reviewWord(reviewState)}
              </Badge>
              {reviewer ? (
                <div>
                  <Button
                    onClick={() => {
                      void (async () => {
                        await requestChanges({
                          data: { filename: selectedKey, projectId, runId },
                        });
                        refresh();
                      })();
                    }}
                    type="button"
                    variant="outline"
                  >
                    Request changes
                  </Button>
                </div>
              ) : null}
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No comments on this shot.
                </p>
              ) : (
                <ul>
                  {comments.map((item) => (
                    <li className="border-t py-3 text-sm" key={item.id}>
                      <p className="text-muted-foreground text-xs">
                        {item.authorEmail} · {formatWhen(item.createdAt)}
                      </p>
                      <p className="mt-1">{item.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  void (async () => {
                    await addComment({
                      data: {
                        body: comment,
                        filename: selectedKey,
                        projectId,
                        runId,
                      },
                    });
                    setComment("");
                    refresh();
                  })();
                }}
              >
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Label htmlFor="comment">Comment</Label>
                  <Input
                    id="comment"
                    onChange={(event) => {
                      setComment(event.target.value);
                    }}
                    value={comment}
                  />
                </div>
                <Button
                  disabled={comment.trim().length === 0}
                  type="submit"
                  variant="outline"
                >
                  Comment
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function runTitle(
  branch: string | null,
  commitSha: string,
  prNumber: number | null
): string {
  if (prNumber !== null) {
    return `PR ${prNumber.toString()}`;
  }

  if (branch !== null && branch.length <= 32) {
    return branch;
  }

  return shortSha(commitSha);
}

function reviewWord(state: string | undefined): string {
  if (state === "accepted") {
    return "Accepted";
  }

  if (state === "changes_requested") {
    return "Changes requested";
  }

  return "Still waiting";
}

function reviewVariant(
  state: string | undefined
): "default" | "destructive" | "secondary" {
  if (state === "accepted") {
    return "default";
  }

  if (state === "changes_requested") {
    return "destructive";
  }

  return "secondary";
}
