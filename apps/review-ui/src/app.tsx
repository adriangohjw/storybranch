import type { Report, ReportEntry } from "@storybranch/report";
import { useEffect, useMemo, useState } from "react";

import { acceptAll, fetchReport } from "./api.ts";
import { ComparisonViewer } from "./comparison-viewer.tsx";
import { matchesFilter } from "./lib/report-ui.ts";
import { ShotList } from "./shot-list.tsx";

export const App = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState("attention");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
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

  const selected: ReportEntry | null = useMemo(() => {
    if (report === null || selectedFilename === null) {
      return null;
    }

    return (
      report.entries.find((entry) => entry.filename === selectedFilename) ??
      null
    );
  }, [report, selectedFilename]);

  return (
    <div className="min-h-full font-sans leading-normal">
      <header className="border-b border-zinc-800 px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight">
          storybranch review
        </h1>
        {report === null ? null : (
          <p className="mt-1 text-sm text-zinc-400">
            commit {report.commit.slice(0, 7)} · {report.entries.length}{" "}
            snapshots
          </p>
        )}
        {error === null ? null : (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Filter
            <select
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              onChange={(event) => {
                setFilter(event.target.value);
              }}
              value={filter}
            >
              <option value="attention">Needs attention</option>
              <option value="changed">Changed</option>
              <option value="new">New</option>
              <option value="stale">Stale</option>
              <option value="error">Error</option>
              <option value="unchanged">Unchanged</option>
              <option value="all">All</option>
            </select>
          </label>
          <button
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
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
      <main className="grid min-h-[calc(100vh-9rem)] grid-cols-1 lg:grid-cols-[minmax(240px,360px)_1fr]">
        <aside className="overflow-auto border-b border-zinc-800 p-2 lg:border-r lg:border-b-0">
          <ShotList
            entries={visible}
            onAccept={refreshReport}
            onSelect={setSelectedFilename}
            selectedFilename={selectedFilename}
          />
        </aside>
        <section className="overflow-auto p-4">
          <ComparisonViewer entry={selected} />
        </section>
      </main>
    </div>
  );
};
