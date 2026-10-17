function pendingApproval(status: string): boolean {
  return status === "new" || status === "changed";
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

  const noBaseline = root.querySelector<HTMLElement>("[data-no-baseline]");
  const diffControls = root.querySelector<HTMLElement>("[data-diff-controls]");

  const diffToggle =
    root.querySelector<HTMLButtonElement>("[data-diff-toggle]");

  const diffKnob = root.querySelector<HTMLElement>("[data-diff-knob]");
  const acceptedMsg = root.querySelector<HTMLElement>("[data-accepted-msg]");
  const aside = root.querySelector<HTMLElement>("[data-aside]");
  const asideLabel = root.querySelector<HTMLElement>("[data-aside-label]");
  const shotList = root.querySelector<HTMLElement>("[data-shot-list]");
  const collapseBtn = root.querySelector<HTMLButtonElement>("[data-collapse]");
  const main = root.querySelector<HTMLElement>("[data-main]");

  const baselineFrame = root.querySelector<HTMLElement>(
    "[data-baseline-frame]"
  );

  const previewFrame = root.querySelector<HTMLElement>("[data-preview-frame]");

  let overlayOn = true;
  let collapsed = false;

  let selectedId =
    selectButtons.find((button) => button.classList.contains("border-zinc-500"))
      ?.dataset.id ??
    selectButtons[0]?.dataset.id ??
    null;

  function rowApproved(row: HTMLElement): boolean {
    return row.dataset.approved === "1";
  }

  function visibleRows(): HTMLElement[] {
    const value = filter?.value ?? "all";

    return rows.filter((row) => {
      if (row.hidden === true) {
        return false;
      }

      return matchesFilter(
        row.dataset.status ?? "",
        value,
        rowApproved(row)
      );
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

  function setBaselinePanel(baseline: string): void {
    if (baseline === "") {
      if (baselineImg !== null) {
        baselineImg.hidden = true;
      }

      if (baselineFrame !== null) {
        baselineFrame.hidden = true;
      }

      noBaseline?.classList.remove("hidden");

      return;
    }

    if (baselineImg !== null) {
      baselineImg.hidden = false;
      baselineImg.src = baseline;
    }

    if (baselineFrame !== null) {
      baselineFrame.hidden = false;
    }

    noBaseline?.classList.add("hidden");
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

    const hasDiff = diff.length > 0;

    if (diffControls !== null) {
      diffControls.classList.toggle("invisible", !hasDiff);
      diffControls.classList.toggle("pointer-events-none", !hasDiff);
    }

    if (diffImg !== null) {
      diffImg.src = diff;
      diffImg.classList.toggle("hidden", !hasDiff || !overlayOn);
    }

    if (acceptedMsg !== null) {
      acceptedMsg.classList.add("hidden");
      acceptedMsg.textContent = "";
    }
  }

  function showEmptyFilterMessage(): void {
    if (acceptedMsg === null) {
      return;
    }

    const value = filter?.value ?? "all";
    const pending = rows.filter(
      (row) => !rowApproved(row) && pendingApproval(row.dataset.status ?? "")
    );

    if (value === "attention" && pending.length === 0) {
      acceptedMsg.textContent = "No snapshots need attention.";
    } else {
      acceptedMsg.textContent = "No snapshots match this filter.";
    }

    acceptedMsg.classList.remove("hidden");
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

    const stillSelected = visibleRows().some(
      (row) => row.dataset.id === selectedId
    );

    if (!stillSelected) {
      const first =
        visibleRows()[0]?.querySelector<HTMLButtonElement>("[data-select]");

      if (first !== undefined && first !== null) {
        selectShot(first);
      } else {
        showEmptyFilterMessage();
      }
    }
  }

  function markRowApproved(row: HTMLElement): void {
    row.dataset.approved = "1";

    const badge = row.querySelector<HTMLElement>("[data-shot-badge]");

    if (badge !== null) {
      badge.textContent = "approved";
      badge.className =
        "rounded-full px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide uppercase bg-violet-500/20 text-violet-300";
    }

    const acceptButton = row.querySelector<HTMLButtonElement>("[data-accept]");

    acceptButton?.remove();
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

  root.querySelector("[data-accept-all]")?.addEventListener("click", () => {
    for (const row of rows) {
      if (
        !rowApproved(row) &&
        pendingApproval(row.dataset.status ?? "")
      ) {
        markRowApproved(row);
      }
    }

    applyFilter();
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
