// Storybook's manager crashes on a prebundled jsx-runtime. createElement uses its react.
import { createElement, useEffect, useState } from "react";
import { Addon_TypesEnum } from "storybook/internal/types";
import {
  addons,
  experimental_getStatusStore,
  experimental_getTestProviderStore,
} from "storybook/manager-api";

import { isAddonPayload } from "@/addon/status.ts";
import type { AddonPayload } from "@/addon/status.ts";

const ADDON_ID = "storybranch/visual-tests";
const ROUTE = "/__storybranch";

interface Snapshot {
  error: string | null;
  reviewUrl: string | null;
  running: boolean;
  summary: string;
}

const listeners = new Set<() => void>();

let snapshot: Snapshot = {
  error: null,
  reviewUrl: null,
  running: false,
  summary: "No report yet",
};

let busy = false;

function publish(next: Snapshot): void {
  snapshot = next;

  for (const listener of listeners) {
    listener();
  }
}

function useSnapshot(): Snapshot {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = (): void => {
      setTick((value) => value + 1);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return snapshot;
}

function apply(body: AddonPayload): void {
  const store = experimental_getStatusStore(ADDON_ID);
  store.unset();

  if (body.stories.length > 0) {
    store.set(
      body.stories.map((story) => ({
        description: story.detail,
        storyId: story.storyId,
        title: "Visual tests",
        typeId: ADDON_ID,
        value: story.sidebar,
      }))
    );
  }

  publish({
    error: body.error,
    reviewUrl: body.reviewUrl,
    running: body.running,
    summary: body.summary,
  });
}

function clearStatuses(): void {
  experimental_getStatusStore(ADDON_ID).unset();
  publish({
    error: null,
    reviewUrl: snapshot.reviewUrl,
    running: false,
    summary: "No report yet",
  });
}

async function readPayload(response: Response): Promise<AddonPayload> {
  const body: unknown = await response.json();

  if (!isAddonPayload(body)) {
    throw new Error("visual tests returned an invalid report");
  }

  return body;
}

async function loadReport(): Promise<void> {
  try {
    const response = await fetch(ROUTE);

    if (!response.ok) {
      return;
    }

    apply(await readPayload(response));
  } catch {
    // storybook build has no dev middleware
  }
}

async function runVisualTests(): Promise<void> {
  if (busy) {
    return;
  }

  busy = true;
  publish({ ...snapshot, error: null, running: true });
  const provider = experimental_getTestProviderStore(ADDON_ID);

  try {
    await provider.runWithState(async () => {
      const response = await fetch(ROUTE, { method: "POST" });
      const body = await readPayload(response);
      apply(body);

      if (response.status === 409) {
        return;
      }

      if (!response.ok) {
        throw new Error(body.error ?? "visual tests failed");
      }
    });
  } finally {
    busy = false;

    if (snapshot.running) {
      publish({ ...snapshot, running: false });
    }
  }
}

function Panel() {
  const current = useSnapshot();

  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        fontSize: 12,
        gap: 6,
        padding: "4px 8px 8px",
      },
    },
    createElement(
      "p",
      { style: { fontWeight: 600, margin: 0 } },
      "Visual tests"
    ),
    createElement("p", { style: { margin: 0 } }, current.summary),
    current.error === null
      ? null
      : createElement("p", { style: { margin: 0 } }, current.error),
    createElement(
      "button",
      {
        disabled: current.running,
        onClick: () => {
          void runVisualTests();
        },
        type: "button",
      },
      current.running ? "Running visual tests" : "Run visual tests"
    ),
    current.reviewUrl === null
      ? createElement(
          "p",
          { style: { margin: 0 } },
          "Accept baselines in review."
        )
      : createElement(
          "a",
          { href: current.reviewUrl, rel: "noreferrer", target: "_blank" },
          "Open review"
        )
  );
}

addons.register(ADDON_ID, () => {
  const provider = experimental_getTestProviderStore(ADDON_ID);
  provider.onRunAll(() => {
    void runVisualTests();
  });
  provider.onClearAll(clearStatuses);
  addons.add(ADDON_ID, {
    clear: clearStatuses,
    render: () => createElement(Panel),
    type: Addon_TypesEnum.experimental_TEST_PROVIDER,
  });
  void loadReport();
});
