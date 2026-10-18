const statusBadgeClass = {
  changed:
    "rounded-full px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide uppercase bg-amber-500/20 text-amber-300",
  new: "rounded-full px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide uppercase bg-sky-500/20 text-sky-300",
} as const;

const headerBadgeClass = {
  approved:
    "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-violet-500/20 text-violet-300",
  changed:
    "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-amber-500/20 text-amber-300",
  new: "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-sky-500/20 text-sky-300",
  unchanged:
    "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/20 text-emerald-300",
} as const;

const shotBrowserPattern = /__(?<browser>chrome|firefox|edge)\.png$/iu;

function statusBadgeClassFor(status: string): string {
  if (status === "new") {
    return statusBadgeClass.new;
  }

  return statusBadgeClass.changed;
}

const approvedBadgeClass =
  "rounded-full px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide uppercase bg-violet-500/20 text-violet-300";

function pendingApproval(status: string): boolean {
  return status === "new" || status === "changed";
}

function storyPartsFromId(storyId: string) {
  const marker = "--";
  const index = storyId.indexOf(marker);

  if (index === -1) {
    return { component: storyId, story: "default" };
  }

  return {
    component: storyId.slice(0, index),
    story: storyId.slice(index + marker.length),
  };
}

function headerBadgeClassFor(displayStatus: string): string {
  switch (displayStatus) {
    case "approved": {
      return headerBadgeClass.approved;
    }

    case "changed": {
      return headerBadgeClass.changed;
    }

    case "new": {
      return headerBadgeClass.new;
    }

    case "unchanged": {
      return headerBadgeClass.unchanged;
    }

    default: {
      return headerBadgeClass.changed;
    }
  }
}

function browserFromShot(id: string, label: string): string {
  const match = shotBrowserPattern.exec(id);
  const fromId = match?.groups?.browser;

  if (fromId !== undefined) {
    return fromId;
  }

  const segment = label.split("·").at(-1)?.trim();

  return segment !== undefined && segment.length > 0 ? segment : "chrome";
}

function matchesFilter(
  status: string,
  value: string,
  approved: boolean
): boolean {
  if (value === "all") {
    return true;
  }

  if (value === "attention") {
    return !approved && pendingApproval(status);
  }

  if (value === "approved") {
    return approved;
  }

  if (value === "unchanged") {
    return status === "unchanged";
  }

  return false;
}

function rowApproved(row: HTMLElement): boolean {
  return row.dataset.approved === "1";
}

function replayEmptyIconPop(icon: HTMLElement | null): void {
  if (icon === null) {
    return;
  }

  icon.classList.remove("review-demo-empty-pop");
  void icon.offsetWidth;
  icon.classList.add("review-demo-empty-pop");
}

function setRowActionButtons(row: HTMLElement, approved: boolean): void {
  const acceptButton = row.querySelector<HTMLButtonElement>("[data-accept]");
  const resetButton = row.querySelector<HTMLButtonElement>("[data-reset]");

  if (approved) {
    acceptButton?.classList.add("hidden");
    resetButton?.classList.remove("hidden");
  } else {
    acceptButton?.classList.remove("hidden");
    resetButton?.classList.add("hidden");
  }
}

function markRowApproved(row: HTMLElement): void {
  row.dataset.approved = "1";

  const badge = row.querySelector<HTMLElement>("[data-shot-badge]");

  if (badge !== null) {
    badge.textContent = "approved";
    badge.className = approvedBadgeClass;
  }

  setRowActionButtons(row, true);
}

function unmarkRowApproved(row: HTMLElement): void {
  delete row.dataset.approved;

  const status = row.dataset.status ?? "changed";
  const badge = row.querySelector<HTMLElement>("[data-shot-badge]");

  if (badge !== null) {
    badge.textContent = status;
    badge.className = statusBadgeClassFor(status);
  }

  setRowActionButtons(row, false);
}

function initReviewDemo(root: HTMLElement): void {
  if (root.dataset.ready === "1") {
    return;
  }

  root.dataset.ready = "1";

  const rows = [...root.querySelectorAll<HTMLElement>("[data-shot-row]")];

  const selectButtons = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-select]"),
  ];

  const filter = root.querySelector<HTMLSelectElement>("[data-filter]");

  const baselineImg = root.querySelector<HTMLImageElement>(
    "[data-baseline-img]"
  );

  const actualImg = root.querySelector<HTMLImageElement>("[data-actual-img]");
  const diffImg = root.querySelector<HTMLImageElement>("[data-diff-img]");

  const baselineEmpty = root.querySelector<HTMLElement>(
    "[data-baseline-empty]"
  );

  const diffControls = root.querySelector<HTMLElement>("[data-diff-controls]");

  const diffToggle =
    root.querySelector<HTMLButtonElement>("[data-diff-toggle]");

  const diffKnob = root.querySelector<HTMLElement>("[data-diff-knob]");
  const comparison = root.querySelector<HTMLElement>("[data-comparison]");
  const emptyState = root.querySelector<HTMLElement>("[data-empty-state]");

  const emptyIconAttention = root.querySelector<HTMLElement>(
    "[data-empty-icon-attention]"
  );

  const emptyIconFilter = root.querySelector<HTMLElement>(
    "[data-empty-icon-filter]"
  );

  const emptyTitle = root.querySelector<HTMLElement>("[data-empty-title]");

  const emptySubtitle = root.querySelector<HTMLElement>(
    "[data-empty-subtitle]"
  );

  const aside = root.querySelector<HTMLElement>("[data-aside]");
  const asideLabel = root.querySelector<HTMLElement>("[data-aside-label]");
  const shotList = root.querySelector<HTMLElement>("[data-shot-list]");
  const collapseBtn = root.querySelector<HTMLButtonElement>("[data-collapse]");
  const main = root.querySelector<HTMLElement>("[data-main]");

  const baselineFrame = root.querySelector<HTMLElement>(
    "[data-baseline-frame]"
  );

  const previewFrame = root.querySelector<HTMLElement>("[data-preview-frame]");

  const headerBadge = root.querySelector<HTMLElement>("[data-header-badge]");

  const headerBrowser = root.querySelector<HTMLElement>(
    "[data-header-browser]"
  );

  const headerComponent = root.querySelector<HTMLElement>(
    "[data-header-component]"
  );

  const headerStory = root.querySelector<HTMLElement>("[data-header-story]");
  const headerLabel = root.querySelector<HTMLElement>("[data-header-label]");

  const headerFilename = root.querySelector<HTMLElement>(
    "[data-header-filename]"
  );

  const viewerAccept = root.querySelector<HTMLButtonElement>(
    "[data-viewer-accept]"
  );

  let overlayOn = true;
  let collapsed = false;

  let selectedId =
    selectButtons.find((button) => button.classList.contains("border-zinc-500"))
      ?.dataset.id ??
    selectButtons[0]?.dataset.id ??
    null;

  function visibleRows(): HTMLElement[] {
    const value = filter?.value ?? "all";

    return rows.filter((row) => {
      if (row.hidden === true) {
        return false;
      }

      return matchesFilter(row.dataset.status ?? "", value, rowApproved(row));
    });
  }

  function syncGroups(): void {
    for (const group of root.querySelectorAll<HTMLElement>(
      "[data-story-group]"
    )) {
      const anyVisible = [
        ...group.querySelectorAll<HTMLElement>("[data-shot-row]"),
      ].some((row) => row.hidden === false);

      group.hidden = !anyVisible;
    }
  }

  function setFrameAspect(aspect: string): void {
    if (baselineFrame !== null) {
      baselineFrame.style.aspectRatio = aspect;
    }

    if (previewFrame !== null) {
      previewFrame.style.aspectRatio = aspect;
    }
  }

  function syncAspectFromImage(img: HTMLImageElement): void {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setFrameAspect(`${img.naturalWidth} / ${img.naturalHeight}`);
    }
  }

  function setBaselinePanel(baseline: string): void {
    if (baseline === "") {
      baselineImg?.classList.add("hidden");
      baselineFrame?.classList.add("hidden");
      baselineEmpty?.classList.remove("hidden");
      baselineEmpty?.classList.add("flex");

      return;
    }

    baselineEmpty?.classList.add("hidden");
    baselineEmpty?.classList.remove("flex");
    baselineFrame?.classList.remove("hidden");
    baselineImg?.classList.remove("hidden");

    if (baselineImg !== null) {
      baselineImg.src = baseline;
    }
  }

  function syncSnapshotHeader(button: HTMLButtonElement): void {
    const row = button.closest<HTMLElement>("[data-shot-row]");
    const status = row?.dataset.status ?? button.dataset.status ?? "changed";
    const approved = row !== null && rowApproved(row);
    const displayStatus = approved ? "approved" : status;

    if (headerBadge !== null) {
      headerBadge.textContent = displayStatus;
      headerBadge.className = headerBadgeClassFor(displayStatus);
    }

    const storyId = button.dataset.storyId ?? "";
    const { component, story } = storyPartsFromId(storyId);
    const id = button.dataset.id ?? "";
    const label = button.dataset.label ?? "";

    if (headerComponent !== null) {
      headerComponent.textContent = component;
    }

    if (headerStory !== null) {
      headerStory.textContent = story;
    }

    if (headerLabel !== null) {
      headerLabel.textContent = label;
    }

    if (headerFilename !== null) {
      headerFilename.textContent = id;
    }

    if (headerBrowser !== null) {
      headerBrowser.textContent = browserFromShot(id, label);
    }

    const canAccept =
      !approved && pendingApproval(status) && status !== "unchanged";

    if (viewerAccept !== null) {
      viewerAccept.hidden = !canAccept;
    }
  }

  function selectShot(button: HTMLButtonElement): void {
    selectedId = button.dataset.id ?? null;

    for (const selectButton of selectButtons) {
      const on = selectButton.dataset.id === selectedId;
      selectButton.classList.toggle("border-zinc-500", on);
      selectButton.classList.toggle("bg-zinc-800", on);
      selectButton.classList.toggle("border-transparent", !on);
    }

    const baseline = button.dataset.baseline ?? "";
    const actual = button.dataset.actual ?? "";
    const diff = button.dataset.diff ?? "";
    const aspect = button.dataset.aspect ?? "800 / 300";

    setFrameAspect(aspect);

    if (actualImg !== null && actual.length > 0) {
      actualImg.hidden = false;
      actualImg.src = actual;
    }

    setBaselinePanel(baseline);
    syncSnapshotHeader(button);

    const hasDiff = diff.length > 0;

    if (diffControls !== null) {
      diffControls.classList.toggle("invisible", !hasDiff);
      diffControls.classList.toggle("pointer-events-none", !hasDiff);
    }

    if (diffImg !== null) {
      diffImg.src = diff;
      diffImg.classList.toggle("hidden", !hasDiff || !overlayOn);
    }
  }

  function clearSelectionHighlight(): void {
    selectedId = null;

    for (const selectButton of selectButtons) {
      selectButton.classList.remove("border-zinc-500", "bg-zinc-800");
      selectButton.classList.add("border-transparent");
    }
  }

  function pendingAttentionRows(): HTMLElement[] {
    return rows.filter(
      (row) => !rowApproved(row) && pendingApproval(row.dataset.status ?? "")
    );
  }

  function isAttentionClearState(): boolean {
    const value = filter?.value ?? "all";

    return value === "attention" && pendingAttentionRows().length === 0;
  }

  function showEmptyViewer(): void {
    comparison?.classList.add("hidden");
    emptyState?.classList.remove("hidden");
    emptyState?.classList.add("flex");
    clearSelectionHighlight();

    if (isAttentionClearState()) {
      emptyIconAttention?.classList.remove("hidden");
      emptyIconAttention?.classList.add("flex");
      emptyIconFilter?.classList.add("hidden");
      emptyIconFilter?.classList.remove("flex");

      if (emptyTitle !== null) {
        emptyTitle.textContent = "Nothing needs attention";
      }

      if (emptySubtitle !== null) {
        emptySubtitle.textContent =
          "Every snapshot in this filter is unchanged or already accepted.";
        emptySubtitle.hidden = false;
      }

      replayEmptyIconPop(emptyIconAttention);

      return;
    }

    emptyIconAttention?.classList.add("hidden");
    emptyIconAttention?.classList.remove("flex");
    emptyIconFilter?.classList.remove("hidden");
    emptyIconFilter?.classList.add("flex");

    if (emptyTitle !== null) {
      emptyTitle.textContent = "No snapshots match this filter";
    }

    if (emptySubtitle !== null) {
      emptySubtitle.textContent = "Try another filter to see more snapshots.";
      emptySubtitle.hidden = false;
    }

    replayEmptyIconPop(emptyIconFilter);
  }

  function hideEmptyViewer(): void {
    comparison?.classList.remove("hidden");
    emptyState?.classList.add("hidden");
    emptyState?.classList.remove("flex");
  }

  function applyFilter(): void {
    const value = filter?.value ?? "all";

    for (const row of rows) {
      row.hidden = !matchesFilter(
        row.dataset.status ?? "",
        value,
        rowApproved(row)
      );
    }

    syncGroups();

    const visible = visibleRows();

    if (visible.length === 0) {
      showEmptyViewer();

      return;
    }

    hideEmptyViewer();

    const stillSelected = visible.some((row) => row.dataset.id === selectedId);

    if (stillSelected) {
      const selected = selectButtons.find(
        (button) => button.dataset.id === selectedId
      );

      if (selected !== undefined) {
        syncSnapshotHeader(selected);
      }
    } else {
      const first =
        visible[0]?.querySelector<HTMLButtonElement>("[data-select]");

      if (first !== undefined && first !== null) {
        selectShot(first);
      }
    }
  }

  function acceptId(id: string): void {
    const row = rows.find((candidate) => candidate.dataset.id === id);

    if (row === undefined || rowApproved(row)) {
      return;
    }

    if (!pendingApproval(row.dataset.status ?? "")) {
      return;
    }

    markRowApproved(row);
    applyFilter();
  }

  function resetId(id: string): void {
    const row = rows.find((candidate) => candidate.dataset.id === id);

    if (row === undefined || !rowApproved(row)) {
      return;
    }

    if (!pendingApproval(row.dataset.status ?? "")) {
      return;
    }

    unmarkRowApproved(row);
    applyFilter();
  }

  filter?.addEventListener("change", applyFilter);

  for (const button of selectButtons) {
    button.addEventListener("click", () => {
      selectShot(button);
    });
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-accept]"
  )) {
    button.addEventListener("click", () => {
      const { id } = button.dataset;

      if (id !== undefined && id !== "") {
        acceptId(id);
      }
    });
  }

  viewerAccept?.addEventListener("click", () => {
    if (selectedId !== null) {
      acceptId(selectedId);
    }
  });

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-reset]"
  )) {
    button.addEventListener("click", () => {
      const { id } = button.dataset;

      if (id !== undefined && id !== "") {
        resetId(id);
      }
    });
  }

  root.querySelector("[data-accept-all]")?.addEventListener("click", () => {
    for (const row of rows) {
      if (!rowApproved(row) && pendingApproval(row.dataset.status ?? "")) {
        markRowApproved(row);
      }
    }

    applyFilter();
  });

  actualImg?.addEventListener("load", () => {
    if (actualImg !== null) {
      syncAspectFromImage(actualImg);
    }
  });

  baselineImg?.addEventListener("load", () => {
    if (baselineImg !== null && baselineImg.hidden !== true) {
      syncAspectFromImage(baselineImg);
    }
  });

  applyFilter();

  diffToggle?.addEventListener("click", () => {
    overlayOn = !overlayOn;
    diffToggle.setAttribute("aria-pressed", overlayOn ? "true" : "false");
    diffToggle.classList.toggle("bg-sky-600", overlayOn);
    diffToggle.classList.toggle("bg-zinc-700", !overlayOn);
    diffKnob?.classList.toggle("translate-x-4", overlayOn);

    const selected = selectButtons.find(
      (button) => button.dataset.id === selectedId
    );

    const hasDiff =
      selected?.dataset.diff !== undefined && selected.dataset.diff !== "";

    diffImg?.classList.toggle("hidden", !hasDiff || !overlayOn);
  });

  collapseBtn?.addEventListener("click", () => {
    collapsed = !collapsed;
    asideLabel?.classList.toggle("hidden", collapsed);
    shotList?.classList.toggle("hidden", collapsed);

    const collapseLabel = collapseBtn.querySelector("span");

    if (collapseLabel !== null) {
      collapseLabel.textContent = collapsed ? "⟩" : "⟨";
    }

    collapseBtn.setAttribute(
      "aria-label",
      collapsed ? "Expand snapshot list" : "Collapse snapshot list"
    );
    aside?.classList.toggle("lg:w-9", collapsed);
    aside?.classList.toggle("lg:max-w-72", !collapsed);
    main?.classList.toggle("lg:grid-cols-[auto_1fr]", collapsed);
    main?.classList.toggle(
      "lg:grid-cols-[minmax(14rem,18rem)_1fr]",
      !collapsed
    );
  });
}

export function bootReviewDemo(): void {
  for (const root of document.querySelectorAll<HTMLElement>(
    "[data-review-demo]"
  )) {
    initReviewDemo(root);
  }
}

bootReviewDemo();

document.addEventListener("astro:page-load", bootReviewDemo);
