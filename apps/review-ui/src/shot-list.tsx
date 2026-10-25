import type { ReportEntry } from "@storybranch/report";
import { useMemo, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

import { acceptShot as postAcceptShot } from "@/api.ts";
import { cn } from "@/lib/cn.ts";
import { badgeTone, needsAttention } from "@/lib/report-ui.ts";
import type {
  ShotSizeNode,
  SnapshotLeaf,
  StoryNode,
} from "@/lib/snapshot-tree.ts";
import { buildSnapshotTree } from "@/lib/snapshot-tree.ts";

interface ShotListProps {
  acceptShot?: (filename: string) => Promise<void>;
  entries: ReportEntry[];
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  selectedFilename: string | null;
  showAccept?: boolean;
}

export const ShotList = ({
  acceptShot,
  entries,
  onAccept,
  onSelect,
  selectedFilename,
  showAccept = true,
}: ShotListProps) => {
  const postAccept =
    acceptShot ??
    (async (filename: string) => {
      await postAcceptShot(filename);
    });

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
      <p className="text-ink-soft px-1 text-xs">No snapshots in this filter.</p>
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
              <div className="border-line mt-0.5 space-y-1 border-l pl-2">
                {component.stories.map((story) => (
                  <StoryBranch
                    acceptShot={postAccept}
                    component={component.component}
                    isOpen={isOpen}
                    key={`${component.component}/${story.story}`}
                    onAccept={onAccept}
                    onSelect={onSelect}
                    onToggle={toggle}
                    selectedFilename={selectedFilename}
                    showAccept={showAccept}
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
  acceptShot: (filename: string) => Promise<void>;
  component: string;
  isOpen: (key: string, hasAttention: boolean) => boolean;
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  onToggle: (key: string, hasAttention: boolean) => void;
  selectedFilename: string | null;
  showAccept: boolean;
  story: StoryNode;
}

const StoryBranch = ({
  acceptShot,
  component,
  isOpen,
  onAccept,
  onSelect,
  onToggle,
  selectedFilename,
  showAccept,
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
        <div className="border-line mt-0.5 space-y-1 border-l pl-2">
          {story.shots.map((shot) => (
            <ShotSizeBranch
              acceptShot={acceptShot}
              component={component}
              isOpen={isOpen}
              key={`${story.story}/${shot.label}`}
              onAccept={onAccept}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedFilename={selectedFilename}
              shot={shot}
              showAccept={showAccept}
              storyName={story.story}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

interface ShotSizeBranchProps {
  acceptShot: (filename: string) => Promise<void>;
  component: string;
  isOpen: (key: string, hasAttention: boolean) => boolean;
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  onToggle: (key: string, hasAttention: boolean) => void;
  selectedFilename: string | null;
  shot: ShotSizeNode;
  showAccept: boolean;
  storyName: string;
}

const ShotSizeBranch = ({
  acceptShot,
  component,
  isOpen,
  onAccept,
  onSelect,
  onToggle,
  selectedFilename,
  shot,
  showAccept,
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
        <ul className="border-line mt-0.5 space-y-1 border-l pl-2">
          {shot.leaves.map((leaf) => (
            <li
              className="flex items-center gap-0.5"
              key={
                leaf.entry.filename ??
                `${leaf.entry.storyId}:${leaf.browser}:error`
              }
            >
              <SnapshotLeafRow
                leaf={leaf}
                onSelect={onSelect}
                selected={leaf.entry.filename === selectedFilename}
              />
              <AcceptButton
                acceptShot={acceptShot}
                entry={leaf.entry}
                onAccept={onAccept}
                showAccept={showAccept}
              />
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
      "hover:bg-pending/40 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left",
      tone === "component" && "text-ink font-semibold",
      tone === "story" && "text-ink-soft font-medium",
      tone === "size" && "text-ink-soft"
    )}
    onClick={onToggle}
    type="button"
  >
    <LuChevronDown
      aria-hidden
      className={cn(
        "text-ink-soft size-3 shrink-0 transition-transform",
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
        "shot-cell flex min-w-0 flex-1 flex-col items-start justify-center gap-1 rounded-sm border px-2 py-1.5 text-left transition-colors",
        "hover:border-ink hover:bg-pending/40",
        selected ? "border-ink bg-paper-deep" : "border-transparent"
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
      <span className="text-ink-soft text-[11px] leading-snug capitalize">
        {browser}
      </span>
    </button>
  );
};

interface AcceptButtonProps {
  acceptShot: (filename: string) => Promise<void>;
  entry: ReportEntry;
  onAccept: () => void;
  showAccept: boolean;
}

const AcceptButton = ({
  acceptShot,
  entry,
  onAccept,
  showAccept,
}: AcceptButtonProps) => {
  const { filename } = entry;

  const canAccept =
    showAccept &&
    filename !== undefined &&
    needsAttention(entry.status) &&
    entry.status !== "error";

  if (!canAccept) {
    return null;
  }

  return (
    <button
      aria-label="Accept"
      className="text-ink-soft hover:bg-pending/40 hover:text-ink shrink-0 rounded p-1"
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
