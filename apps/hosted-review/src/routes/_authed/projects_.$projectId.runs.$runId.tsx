import type { ReportEntry } from "@storybranch/report";
import { BuildSummary } from "@storybranch/review-ui/build-summary";
import { ComparisonViewer } from "@storybranch/review-ui/comparison-viewer";
import { matchesFilter } from "@storybranch/review-ui/lib/report-ui";
import { ShotList } from "@storybranch/review-ui/shot-list";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  acceptSnapshot,
  addComment,
  loadRun,
  requestChanges,
} from "~/lib/app.functions";
import { canReview } from "~/lib/roles";

export const Route = createFileRoute(
  "/_authed/projects_/$projectId/runs/$runId"
)({
  component: RunPage,
  loader: async ({ params }) =>
    loadRun({
      data: { projectId: params.projectId, runId: params.runId },
    }),
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
  const imagePrefix = `/api/projects/${projectId}/runs/${runId}`;

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

  const shellState = reviewState ?? "pending";

  useEffect(() => {
    document.body.dataset.review = shellState;

    return () => {
      delete document.body.dataset.review;
    };
  }, [shellState]);

  return (
    <div>
      <div className="px-5 py-3 pl-8">
        <p className="text-sm">
          <Link params={{ projectId }} to="/projects/$projectId">
            Back to runs
          </Link>
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          Filter
          <select
            className="border-line bg-sheet rounded-md border px-2 py-1 text-sm"
            onChange={(event) => {
              setFilter(event.target.value);
            }}
            value={filter}
          >
            <option value="all">All</option>
            <option value="attention">Needs attention</option>
            <option value="changes_requested">Changes requested</option>
            <option value="accepted">Accepted</option>
            <option value="unchanged">Unchanged</option>
          </select>
        </label>
      </div>
      <main className="work-sheet mx-3 mb-3 grid min-h-[calc(100vh-8rem)] grid-cols-1 lg:grid-cols-[minmax(14rem,18rem)_1fr]">
        <aside className="border-line border-b p-2 lg:border-r lg:border-b-0">
          <ShotList
            acceptShot={acceptShot}
            entries={visible}
            onAccept={refresh}
            onSelect={setSelectedFilename}
            selectedFilename={activeFilename}
            showAccept={reviewer}
          />
        </aside>
        <section className="min-w-0 space-y-4 p-4">
          <BuildSummary report={data.report} />
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
            <div className="border-line space-y-3 border-t pt-4">
              <p className="text-ink-soft text-xs">
                Review: {reviewState ?? "pending"}
              </p>
              {reviewer ? (
                <button
                  className="chip-button-quiet"
                  onClick={() => {
                    void (async () => {
                      await requestChanges({
                        data: { filename: selectedKey, projectId, runId },
                      });
                      refresh();
                    })();
                  }}
                  type="button"
                >
                  Request changes
                </button>
              ) : null}
              <ul className="space-y-2 text-sm">
                {comments.map((item) => (
                  <li className="bg-sheet rounded-md px-3 py-2" key={item.id}>
                    <p className="text-ink-soft text-xs">
                      {item.authorEmail} · {item.createdAt}
                    </p>
                    <p className="text-ink mt-1">{item.body}</p>
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-2"
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
                <input
                  className="border-line bg-sheet flex-1 rounded-md border px-3 py-2 text-sm"
                  onChange={(event) => {
                    setComment(event.target.value);
                  }}
                  placeholder="Comment on this snapshot"
                  value={comment}
                />
                <button
                  className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium"
                  type="submit"
                >
                  Comment
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
