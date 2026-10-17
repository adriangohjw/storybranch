function needsAttention(status: string): boolean {
  return status !== "unchanged";
}

function matchesFilter(status: string, value: string): boolean {
  if (value === "all") {
    return true;
  }

  if (value === "attention") {
    return needsAttention(status);
  }

  return status === value;
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
  const shotCount = root.querySelector<HTMLElement>("[data-shot-count]");
  const aside = root.querySelector<HTMLElement>("[data-aside]");
  const asideLabel = root.querySelector<HTMLElement>("[data-aside-label]");
  const shotList = root.querySelector<HTMLElement>("[data-shot-list]");
  const collapseBtn = root.querySelector<HTMLButtonElement>("[data-collapse]");
  const main = root.querySelector<HTMLElement>("[data-main]");

  let overlayOn = true;
  let collapsed = false;

  let selectedId =
    selectButtons.find((button) => button.classList.contains("border-zinc-500"))
      ?.dataset.id ??
    selectButtons[0]?.dataset.id ??
    null;

  function remainingRows(): HTMLElement[] {
    return rows.filter((row) => row.dataset.accepted !== "1");
  }

  function visibleRows(): HTMLElement[] {
    const value = filter?.value ?? "attention";

    return remainingRows().filter((row) => {
      if (row.hidden === true) {
        return false;
      }

      return matchesFilter(row.dataset.status ?? "", value);
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

    if (actualImg !== null) {
      actualImg.src = actual;
    }

    if (baseline === "") {
      if (baselineImg !== null) {
        baselineImg.hidden = true;
      }

      noBaseline?.classList.remove("hidden");
    } else {
      if (baselineImg !== null) {
        baselineImg.hidden = false;
        baselineImg.src = baseline;
      }

      noBaseline?.classList.add("hidden");
    }

    const hasDiff = diff.length > 0;

    if (diffControls !== null) {
      diffControls.classList.toggle("hidden", !hasDiff);
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

  function applyFilter(): void {
    const value = filter?.value ?? "attention";

    for (const row of rows) {
      if (row.dataset.accepted === "1") {
        row.hidden = true;
        continue;
      }

      row.hidden = !matchesFilter(row.dataset.status ?? "", value);
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
      } else if (acceptedMsg !== null) {
        acceptedMsg.textContent =
          remainingRows().length === 0
            ? "All demo snapshots accepted."
            : "No snapshots match this filter.";
        acceptedMsg.classList.remove("hidden");
      }
    }
  }

  function acceptId(id: string): void {
    const row = rows.find((candidate) => candidate.dataset.id === id);

    if (row === undefined || row.dataset.accepted === "1") {
      return;
    }

    row.dataset.accepted = "1";
    row.hidden = true;

    if (shotCount !== null) {
      shotCount.textContent = String(remainingRows().length);
    }

    syncGroups();

    if (selectedId === id) {
      const next =
        visibleRows()[0]?.querySelector<HTMLButtonElement>("[data-select]");

      if (next !== undefined && next !== null) {
        selectShot(next);
      } else if (acceptedMsg !== null) {
        acceptedMsg.textContent = "All demo snapshots accepted.";
        acceptedMsg.classList.remove("hidden");
      }
    }
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
        row.dataset.accepted !== "1" &&
        needsAttention(row.dataset.status ?? "")
      ) {
        acceptId(row.dataset.id ?? "");
      }
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
