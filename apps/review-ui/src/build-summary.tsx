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
  const browsers = browsersFor(report);
  const buildTime = formatBuildTime(report.durationMs);

  const commitShort =
    report.commit.length > 0 ? report.commit.slice(0, 6) : "no commit";

  return (
    <div
      className={cn(
        "text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
        compact && "text-ink-soft text-xs",
        className
      )}
    >
      <span>
        <span className={cn("text-ink font-semibold", compact && "text-ink")}>
          {stories}
        </span>{" "}
        Stories
      </span>
      {buildTime === null ? null : (
        <span>
          <span className={cn("text-ink font-semibold", compact && "text-ink")}>
            {buildTime}
          </span>{" "}
          Build time
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="sr-only">Browsers</span>
        {browsers.map((browser) => (
          <BrowserIcon browser={browser} key={browser} />
        ))}
      </span>
      <span className="text-ink font-semibold tracking-tight tabular-nums">
        {commitShort}
      </span>
    </div>
  );
};

function browsersFor(report: Report): string[] {
  const names = new Set<string>();

  for (const entry of report.entries) {
    if (entry.browser !== undefined && entry.browser.length > 0) {
      names.add(entry.browser);
    }
  }

  if (names.size === 0) {
    return [CAPTURE_BROWSER];
  }

  return [...names].toSorted();
}

const BrowserIcon = ({ browser }: { browser: string }) => {
  if (browser === "chrome") {
    return (
      <LuGlobe
        aria-label="Chrome"
        className="text-ink-soft size-4"
        title="Chrome"
      />
    );
  }

  return <span className="text-ink-soft">{browser}</span>;
};
