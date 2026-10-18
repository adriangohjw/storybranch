import type { ReportEntry } from "@storybranch/report";
import { useMemo, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

import { acceptShot } from "@/api.ts";
import { cn } from "@/lib/cn.ts";
import { badgeTone, needsAttention } from "@/lib/report-ui.ts";
import {
  buildSnapshotTree,
  type ShotSizeNode,
  type SnapshotLeaf,
  type StoryNode,
} from "@/lib/snapshot-tree.ts";

interface ShotListProps {
  entries: ReportEntry[];
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  selectedFilename: string | null;
}

export const ShotList = ({
  entries,
  onAccept,
  onSelect,
  selectedFilename,
}: ShotListProps) => {
  const tree = useMemo(() => buildSnapshotTree(entries), [entries]);
  const [openOverrides, setOpenOverrides] = useState<Map<string, boolean>>(
    () => new Map()
  );

  const isOpen = (key: string, hasAttention: boolean) =>
    openOverrides.get(key) ?? hasAttention;

  const toggle = (key: string, hasAttention: boolean) => {
    setOpenOverrides((prev) => {
      const next = new Map(prev);
      const open = isOpen(key, hasAttention);
      next.set(key, !open);
      return next;
    });
  };

  if (tree.components.length === 0) {
    return (
      <p className="px-1 text-xs text-zinc-500">No snapshots in this filter.</p>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {tree.components.map((component) => {
        const componentKey = `c:${component.component}`;
        const componentOpen = isOpen(componentKey, component.hasAttention);

        return (
          <section key={component.component}>
            <TreeToggle
              label={component.component}
              onToggle={() => {
                toggle(componentKey, component.hasAttention);
              }}
              open={componentOpen}
              tone="component"
            />
            {componentOpen ? (
              <div className="mt-0.5 space-y-1 border-l border-zinc-800 pl-2">
                {component.stories.map((story) => (
                  <StoryBranch
                    component={component.component}
                    isOpen={isOpen}
                    key={`${component.component}/${story.story}`}
                    onAccept={onAccept}
                    onSelect={onSelect}
                    onToggle={toggle}
                    selectedFilename={selectedFilename}
                    story={story}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
};

interface StoryBranchProps {
  component: string;
  isOpen: (key: string, hasAttention: boolean) => boolean;
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  onToggle: (key: string, hasAttention: boolean) => void;
  selectedFilename: string | null;
  story: StoryNode;
}

const StoryBranch = ({
  component,
  isOpen,
  onAccept,
  onSelect,
  onToggle,
  selectedFilename,
  story,
}: StoryBranchProps) => {
  const storyKey = `s:${component}/${story.story}`;
  const storyOpen = isOpen(storyKey, story.hasAttention);

  return (
    <div>
      <TreeToggle
        label={story.story}
        onToggle={() => {
          onToggle(storyKey, story.hasAttention);
        }}
        open={storyOpen}
        tone="story"
      />
      {storyOpen ? (
        <div className="mt-0.5 space-y-1 border-l border-zinc-800 pl-2">
          {story.shots.map((shot) => (
            <ShotSizeBranch
              component={component}
              isOpen={isOpen}
              key={`${story.story}/${shot.label}`}
              onAccept={onAccept}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedFilename={selectedFilename}
              shot={shot}
              storyName={story.story}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface ShotSizeBranchProps {
  component: string;
  isOpen: (key: string, hasAttention: boolean) => boolean;
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  onToggle: (key: string, hasAttention: boolean) => void;
  selectedFilename: string | null;
  shot: ShotSizeNode;
  storyName: string;
}

const ShotSizeBranch = ({
  component,
  isOpen,
  onAccept,
  onSelect,
  onToggle,
  selectedFilename,
  shot,
  storyName,
}: ShotSizeBranchProps) => {
  const sizeKey = `z:${component}/${storyName}/${shot.label}`;
  const sizeOpen = isOpen(sizeKey, shot.hasAttention);

  return (
    <div>
      <TreeToggle
        label={shot.label}
        onToggle={() => {
          onToggle(sizeKey, shot.hasAttention);
        }}
        open={sizeOpen}
        tone="size"
      />
      {sizeOpen ? (
        <ul className="mt-0.5 space-y-1 border-l border-zinc-800 pl-2">
          {shot.leaves.map((leaf) => (
            <li
              className="flex items-center gap-0.5"
              key={leaf.entry.filename ?? `${leaf.browser}:error`}
            >
              <SnapshotLeafRow
                leaf={leaf}
                onSelect={onSelect}
                selected={leaf.entry.filename === selectedFilename}
              />
              <AcceptButton entry={leaf.entry} onAccept={onAccept} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

interface TreeToggleProps {
  label: string;
  onToggle: () => void;
  open: boolean;
  tone: "component" | "story" | "size";
}

const TreeToggle = ({ label, onToggle, open, tone }: TreeToggleProps) => (
  <button
    className={cn(
      "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-zinc-800/80",
      tone === "component" && "font-semibold text-zinc-200",
      tone === "story" && "font-medium text-zinc-300",
      tone === "size" && "text-zinc-400"
    )}
    onClick={onToggle}
    type="button"
  >
    <LuChevronDown
      aria-hidden
      className={cn(
        "size-3 shrink-0 text-zinc-500 transition-transform",
        !open && "-rotate-90"
      )}
    />
    <span className="truncate">{label}</span>
  </button>
);

interface SnapshotLeafRowProps {
  leaf: SnapshotLeaf;
  onSelect: (filename: string | null) => void;
  selected: boolean;
}

const SnapshotLeafRow = ({
  leaf,
  onSelect,
  selected,
}: SnapshotLeafRowProps) => {
  const { entry, browser } = leaf;

  return (
    <button
      className={cn(
        "flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md border px-2 py-1.5 text-left transition-colors",
        "hover:border-zinc-600 hover:bg-zinc-800/80",
        selected ? "border-zinc-500 bg-zinc-800" : "border-transparent"
      )}
      onClick={() => {
        onSelect(entry.filename ?? null);
      }}
      type="button"
    >
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide uppercase",
          badgeTone[entry.status]
        )}
      >
        {entry.status}
      </span>
      <span className="text-[11px] leading-snug text-zinc-300 capitalize">
        {browser}
      </span>
    </button>
  );
};

interface AcceptButtonProps {
  entry: ReportEntry;
  onAccept: () => void;
}

const AcceptButton = ({ entry, onAccept }: AcceptButtonProps) => {
  const { filename } = entry;

  const canAccept =
    filename !== undefined &&
    needsAttention(entry.status) &&
    entry.status !== "error";

  if (!canAccept) {
    return null;
  }

  return (
    <button
      aria-label="Accept"
      className="shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-800 hover:text-white"
      onClick={() => {
        void (async () => {
          await acceptShot(filename);
          onAccept();
        })();
      }}
      type="button"
    >
      <LuCheck aria-hidden className="size-3.5" />
    </button>
  );
};
