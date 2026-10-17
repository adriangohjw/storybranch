const filterEl = document.querySelector("#filter");
const groupsEl = document.querySelector("#groups");
const metaEl = document.querySelector("#meta");
const acceptAllEl = document.querySelector("#accept-all");
const panelsEl = document.querySelector("#panels");
const placeholderEl = document.querySelector(".placeholder");
const baselineImg = document.querySelector("#baseline");
const actualImg = document.querySelector("#actual");
const diffImg = document.querySelector("#diff");
const diffPanel = document.querySelector("#diff-panel");
const detailEl = document.querySelector("#detail");

let report = null;
let selectedFilename = null;

function needsAttention(status) {
  return status !== "unchanged";
}

function matchesFilter(entry, filter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "attention") {
    return needsAttention(entry.status);
  }
  return entry.status === filter;
}

function rowKey(entry) {
  return entry.filename ?? `${entry.storyId}:error`;
}

function groupEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const list = groups.get(entry.storyId) ?? [];
    list.push(entry);
    groups.set(entry.storyId, list);
  }
  return [...groups.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}

async function loadReport() {
  const response = await fetch("/api/report");
  report = await response.json();
  metaEl.textContent = `commit ${report.commit.slice(0, 7)} · ${report.entries.length} snapshots`;
  render();
}

function render() {
  const filter = filterEl.value;
  const visible = report.entries.filter((entry) => matchesFilter(entry, filter));
  groupsEl.replaceChildren();
  for (const [storyId, entries] of groupEntries(visible)) {
    const section = document.createElement("section");
    section.className = "story-group";
    const heading = document.createElement("h2");
    heading.textContent = storyId;
    section.append(heading);
    for (const entry of entries) {
      section.append(shotRow(entry));
    }
    groupsEl.append(section);
  }
  if (selectedFilename !== null) {
    const selected = report.entries.find((entry) => entry.filename === selectedFilename);
    if (selected !== undefined) {
      showViewer(selected);
    }
  }
}

function shotRow(entry) {
  const row = document.createElement("div");
  row.className = "shot-row";
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  if (entry.filename === selectedFilename) {
    row.setAttribute("aria-selected", "true");
  }

  const badge = document.createElement("span");
  badge.className = `badge ${entry.status}`;
  badge.textContent = entry.status;
  row.append(badge);

  const label = document.createElement("span");
  label.className = "shot-label";
  label.textContent = entry.filename ?? entry.message ?? entry.storyId;
  row.append(label);

  if (entry.filename !== undefined && needsAttention(entry.status) && entry.status !== "error") {
    const accept = document.createElement("button");
    accept.className = "accept-one";
    accept.type = "button";
    accept.textContent = "Accept";
    accept.addEventListener("click", async (event) => {
      event.stopPropagation();
      await acceptShot(entry.filename);
    });
    row.append(accept);
  }

  row.addEventListener("click", () => {
    selectedFilename = entry.filename ?? null;
    render();
    showViewer(entry);
  });
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      row.click();
    }
  });
  return row;
}

function showViewer(entry) {
  placeholderEl.hidden = true;
  panelsEl.hidden = false;
  detailEl.textContent = entry.message ?? "";

  if (entry.filename === undefined) {
    baselineImg.removeAttribute("src");
    actualImg.removeAttribute("src");
    diffImg.removeAttribute("src");
    diffPanel.hidden = true;
    return;
  }

  const file = encodeURIComponent(entry.filename);
  baselineImg.src = entry.baselinePath ? `/images/baseline/${file}` : "";
  actualImg.src = entry.actualPath ? `/images/actual/${file}` : "";
  if (entry.diffPath) {
    diffImg.src = `/images/diff/${file}`;
    diffPanel.hidden = false;
  } else {
    diffImg.removeAttribute("src");
    diffPanel.hidden = true;
  }
}

async function acceptShot(filename) {
  await fetch(`/api/accept/${encodeURIComponent(filename)}`, { method: "POST" });
  await loadReport();
}

acceptAllEl.addEventListener("click", async () => {
  await fetch("/api/accept-all", { method: "POST" });
  await loadReport();
});

filterEl.addEventListener("change", render);

await loadReport();
