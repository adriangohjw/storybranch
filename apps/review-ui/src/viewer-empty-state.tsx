import type { IconType } from "react-icons";
import {
  LuArrowRight,
  LuCircleDashed,
  LuLoader,
  LuPartyPopper,
} from "react-icons/lu";

import { cn } from "@/lib/cn.ts";

export type ViewerEmptyKind =
  | "attention-clear"
  | "filter-empty"
  | "pick-snapshot"
  | "report-loading";

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
        className="flex size-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300"
      >
        <Icon
          className={cn("size-7", kind === "report-loading" && "animate-spin")}
        />
      </span>
      <p className="text-lg font-semibold text-zinc-100">{title}</p>
      {subtitle === undefined ? null : (
        <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
};
