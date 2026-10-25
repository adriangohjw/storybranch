import type { Report, ReportEntry } from "@storybranch/report";
import { BuildSummary } from "@storybranch/review-ui/build-summary";
import { ComparisonViewer } from "@storybranch/review-ui/comparison-viewer";
import { matchesFilter } from "@storybranch/review-ui/lib/report-ui";
import { ShotList } from "@storybranch/review-ui/shot-list";
import { useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatWhen } from "~/lib/format";
import type { ProofSummary } from "~/lib/proof";
import { runFinding, summarizeProof } from "~/lib/proof";
import { cn } from "~/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "changes_requested", label: "Changes requested" },
  { id: "accepted", label: "Accepted" },
  { id: "unchanged", label: "Unchanged" },
] as const;

export interface ReadOnlyRunProps {
  imagePrefix: string;
  report: Report;
  review: Readonly<Record<string, string>>;
  run: {
    branch: string | null;
    commitSha: string;
    createdAt: string;
    prNumber: number | null;
  };
  title: string;
}

export function ReadOnlyRun({
  imagePrefix,
  report,
  review,
  run,
  title,
}: ReadOnlyRunProps) {
  const [filter, setFilter] = useState("all");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [pane, setPane] = useState<"list" | "detail">("list");
  const proof: ProofSummary = summarizeProof(report.entries, review);

  const visible = useMemo(
    () =>
      report.entries.filter((entry) => {
        if (filter === "changes_requested") {
          return (
            entry.filename !== undefined &&
            review[entry.filename] === "changes_requested"
          );
        }

        if (filter === "accepted") {
          return (
            entry.filename !== undefined && review[entry.filename] === "accepted"
          );
        }

        return matchesFilter(entry, filter);
      }),
    [filter, report.entries, review]
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

  const reviewState =
    selected?.filename === undefined ? undefined : review[selected.filename];

  return (
    <div>
      <div className="space-y-4 px-6 pt-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {runFinding(proof, true, "This run")} Posted{" "}
            {formatWhen(run.createdAt)}. Read-only demo — no sign-in required.
          </p>
        </div>
        <BuildSummary report={report} />
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
            entries={visible}
            onAccept={() => {}}
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
            entry={selected}
            filter={filter}
            imagePrefix={imagePrefix}
            onAccept={() => {}}
            report={report}
            showAccept={false}
            visibleCount={visible.length}
          />
          {selected?.filename === undefined ? null : (
            <div className="mt-6">
              <Badge variant={reviewVariant(reviewState)}>
                {reviewWord(reviewState)}
              </Badge>
            </div>
          )}
        </section>
      </div>
    </div>
  );
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
