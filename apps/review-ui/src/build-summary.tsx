import type { Report } from "@storybranch/report";
import { CAPTURE_BROWSER } from "@storybranch/report";
import { LuGlobe } from "react-icons/lu";

import { cn } from "@/lib/cn.ts";

function formatBuildTime(durationMs: number | undefined): string | null {
  if (durationMs === undefined) {
    return null;
  }

  const totalSec = Math.max(0, Math.round(durationMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  if (min > 0) {
    return `${min}m ${sec}s`;
  }

  return `${sec}s`;
}

function storyCountFor(report: Report): number {
  if (report.storyCount !== undefined) {
    return report.storyCount;
  }

  const ids = new Set<string>();

  for (const entry of report.entries) {
    ids.add(entry.storyId);
  }

  return ids.size;
}

interface BuildSummaryProps {
  className?: string;
  compact?: boolean;
  report: Report;
}

export const BuildSummary = ({
  className,
  compact = false,
  report,
}: BuildSummaryProps) => {
  const stories = storyCountFor(report);
  const buildTime = formatBuildTime(report.durationMs);

  const commitShort =
    report.commit.length > 0 ? report.commit.slice(0, 6) : "—";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300",
        compact && "text-xs text-zinc-400",
        className
      )}
    >
      <span>
        <span
          className={cn(
            "font-semibold text-zinc-100",
            compact && "text-zinc-200"
          )}
        >
          {stories}
        </span>{" "}
        Stories
      </span>
      {buildTime === null ? null : (
        <span>
          <span
            className={cn(
              "font-semibold text-zinc-100",
              compact && "text-zinc-200"
            )}
          >
            {buildTime}
          </span>{" "}
          Build time
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="sr-only">Browsers</span>
        <BrowserIcon browser={CAPTURE_BROWSER} />
      </span>
      <span className="font-mono text-sky-400">{commitShort}</span>
    </div>
  );
};

const BrowserIcon = ({ browser }: { browser: string }) => {
  if (browser === CAPTURE_BROWSER) {
    return (
      <LuGlobe
        aria-label="Chromium"
        className="size-4 text-zinc-300"
        title="Chromium"
      />
    );
  }

  return <span className="text-zinc-400">{browser}</span>;
};
