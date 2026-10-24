import type { IconType } from "react-icons";
import {
  LuArrowRight,
  LuCircleDashed,
  LuLoader,
  LuPartyPopper,
} from "react-icons/lu";

import { cn } from "@/lib/cn.ts";

export type ViewerEmptyKind =
  "attention-clear" | "filter-empty" | "pick-snapshot" | "report-loading";

const copy: Record<
  ViewerEmptyKind,
  { icon: IconType; subtitle?: string; title: string }
> = {
  "attention-clear": {
    icon: LuPartyPopper,
    subtitle: "Every snapshot in this filter is unchanged or already accepted.",
    title: "Nothing needs attention",
  },
  "filter-empty": {
    icon: LuCircleDashed,
    subtitle: "Try another filter to see more snapshots.",
    title: "No snapshots match this filter",
  },
  "pick-snapshot": {
    icon: LuArrowRight,
    subtitle: "Choose a story from the list to compare baseline and this scan.",
    title: "Select a snapshot",
  },
  "report-loading": {
    icon: LuLoader,
    title: "Loading report…",
  },
};

interface ViewerEmptyStateProps {
  className?: string;
  kind: ViewerEmptyKind;
}

export const ViewerEmptyState = ({
  className,
  kind,
}: ViewerEmptyStateProps) => {
  const { icon: Icon, subtitle, title } = copy[kind];

  return (
    <div
      className={cn(
        "flex min-h-[min(22rem,55vh)] flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <span
        aria-hidden
        className="border-line bg-paper-deep text-ink-soft flex size-14 items-center justify-center rounded-full border"
      >
        <Icon
          className={cn("size-7", kind === "report-loading" && "animate-spin")}
        />
      </span>
      <p className="text-ink text-lg font-semibold">{title}</p>
      {subtitle === undefined ? null : (
        <p className="text-ink-soft max-w-sm text-sm leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};
