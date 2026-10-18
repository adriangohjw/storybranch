import type { ReportEntry } from "@storybranch/report";
import { CAPTURE_BROWSER, storyPartsFromId } from "@storybranch/report";

import { needsAttention } from "@/lib/report-ui.ts";

export interface SnapshotLeaf {
  browser: string;
  entry: ReportEntry;
}

export interface SnapshotTree {
  components: ComponentNode[];
}

export interface ComponentNode {
  component: string;
  hasAttention: boolean;
  stories: StoryNode[];
}

export interface StoryNode {
  hasAttention: boolean;
  shots: ShotSizeNode[];
  story: string;
}

export interface ShotSizeNode {
  hasAttention: boolean;
  label: string;
  leaves: SnapshotLeaf[];
}

function shotLabelFor(entry: ReportEntry): string {
  if (entry.shotLabel !== undefined && entry.shotLabel.length > 0) {
    return entry.shotLabel;
  }

  if (entry.filename !== undefined) {
    return entry.filename;
  }

  return "capture error";
}

function pushLeaf(
  map: Map<string, Map<string, Map<string, SnapshotLeaf[]>>>,
  entry: ReportEntry
): void {
  const { component, story } = storyPartsFromId(entry.storyId);
  const size = shotLabelFor(entry);
  const browser = CAPTURE_BROWSER;

  let stories = map.get(component);

  if (stories === undefined) {
    stories = new Map();
    map.set(component, stories);
  }

  let sizes = stories.get(story);

  if (sizes === undefined) {
    sizes = new Map();
    stories.set(story, sizes);
  }

  let leaves = sizes.get(size);

  if (leaves === undefined) {
    leaves = [];
    sizes.set(size, leaves);
  }

  leaves.push({ browser, entry });
}

function subtreeAttention(leaves: SnapshotLeaf[]): boolean {
  return leaves.some((leaf) => needsAttention(leaf.entry.status));
}

export function buildSnapshotTree(entries: ReportEntry[]): SnapshotTree {
  const map = new Map<string, Map<string, Map<string, SnapshotLeaf[]>>>();

  for (const entry of entries) {
    pushLeaf(map, entry);
  }

  const components: ComponentNode[] = [];

  for (const [component, storiesMap] of [...map.entries()].toSorted(
    ([a], [b]) => a.localeCompare(b)
  )) {
    const stories: StoryNode[] = [];

    for (const [story, sizesMap] of [...storiesMap.entries()].toSorted(
      ([a], [b]) => a.localeCompare(b)
    )) {
      const shots: ShotSizeNode[] = [];

      for (const [label, leaves] of [...sizesMap.entries()].toSorted(
        ([a], [b]) => a.localeCompare(b, undefined, { numeric: true })
      )) {
        const sortedLeaves = leaves.toSorted((a, b) =>
          a.browser.localeCompare(b.browser)
        );

        shots.push({
          hasAttention: subtreeAttention(sortedLeaves),
          label,
          leaves: sortedLeaves,
        });
      }

      stories.push({
        hasAttention: shots.some((shot) => shot.hasAttention),
        shots,
        story,
      });
    }

    components.push({
      component,
      hasAttention: stories.some((item) => item.hasAttention),
      stories,
    });
  }

  return { components };
}
