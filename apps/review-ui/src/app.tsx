import type { Report, ReportEntry } from "@storybranch/report";
import { useEffect, useMemo, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

import { acceptAll, fetchReport } from "@/api.ts";
import { BuildSummary } from "@/build-summary.tsx";
import { ComparisonViewer } from "@/comparison-viewer.tsx";
import { cn } from "@/lib/cn.ts";
import { matchesFilter } from "@/lib/report-ui.ts";
import { ShotList } from "@/shot-list.tsx";

export const App = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [shotListCollapsed, setShotListCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const next = await fetchReport();

        if (!cancelled) {
          setReport(next);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : String(loadError)
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReport = () => {
    void (async () => {
      try {
        const next = await fetchReport();
        setReport(next);
        setError(null);
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error ? loadError.message : String(loadError)
        );
      }
    })();
  };

  const visible = useMemo(() => {
    if (report === null) {
      return [];
    }

    return report.entries.filter((entry) => matchesFilter(entry, filter));
  }, [filter, report]);

  const activeFilename = useMemo(() => {
    if (visible.length === 0) {
      return null;
    }

    if (
      selectedFilename !== null &&
      visible.some((entry) => entry.filename === selectedFilename)
    ) {
      return selectedFilename;
    }

    return visible[0]?.filename ?? null;
  }, [selectedFilename, visible]);

  const selected: ReportEntry | null = useMemo(() => {
    if (activeFilename === null) {
      return null;
    }

    return visible.find((entry) => entry.filename === activeFilename) ?? null;
  }, [activeFilename, visible]);

  return (
    <div className="min-h-full font-sans leading-normal">
      <header className="border-line border-b px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight">
          storybranch review
        </h1>
        {report === null ? null : (
          <BuildSummary className="mt-2" report={report} />
        )}
        {error === null ? null : (
          <p className="text-changes mt-2 text-sm">{error}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-ink-soft flex items-center gap-2 text-sm">
            Filter
            <select
              className="border-line bg-sheet text-ink rounded-md border px-2 py-1 text-sm"
              onChange={(event) => {
                setFilter(event.target.value);
              }}
              value={filter}
            >
              <option value="all">All</option>
              <option value="attention">Needs attention</option>
              <option value="stale">Stale</option>
              <option value="error">Error</option>
              <option value="unchanged">Unchanged</option>
            </select>
          </label>
          <button
            className="bg-ink text-paper hover:bg-ink/90 rounded-md px-3 py-1.5 text-sm font-medium"
            onClick={() => {
              void (async () => {
                setReport(await acceptAll());
              })();
            }}
            type="button"
          >
            Accept all
          </button>
        </div>
      </header>
      <main
        className={cn(
          "grid min-h-[calc(100vh-9rem)] grid-cols-1",
          shotListCollapsed
            ? "lg:grid-cols-[auto_1fr]"
            : "lg:grid-cols-[minmax(14rem,18rem)_1fr]"
        )}
      >
        <aside
          className={cn(
            "border-line flex flex-col border-b lg:border-r lg:border-b-0",
            shotListCollapsed ? "lg:w-9" : "lg:max-w-72"
          )}
        >
          <div
            className={cn(
              "border-line flex shrink-0 items-center border-b px-1.5 py-1.5",
              shotListCollapsed
                ? "justify-center"
                : "justify-between gap-2 px-2"
            )}
          >
            {shotListCollapsed ? null : (
              <span className="text-ink-soft truncate text-xs font-medium">
                Snapshots
              </span>
            )}
            <button
              aria-expanded={!shotListCollapsed}
              aria-label={
                shotListCollapsed
                  ? "Expand snapshot list"
                  : "Collapse snapshot list"
              }
              className="text-ink-soft hover:bg-pending/40 hover:text-ink rounded p-1"
              onClick={() => {
                setShotListCollapsed((collapsed) => !collapsed);
              }}
              type="button"
            >
              {shotListCollapsed ? (
                <LuChevronRight aria-hidden className="size-4" />
              ) : (
                <LuChevronLeft aria-hidden className="size-4" />
              )}
            </button>
          </div>
          {shotListCollapsed ? null : (
            <div className="min-h-0 flex-1 overflow-auto p-2">
              <ShotList
                entries={visible}
                onAccept={refreshReport}
                onSelect={setSelectedFilename}
                selectedFilename={activeFilename}
              />
            </div>
          )}
        </aside>
        <section className="min-w-0 overflow-auto p-4">
          <ComparisonViewer
            entry={selected}
            filter={filter}
            onAccept={refreshReport}
            report={report}
            visibleCount={visible.length}
          />
        </section>
      </main>
    </div>
  );
};
