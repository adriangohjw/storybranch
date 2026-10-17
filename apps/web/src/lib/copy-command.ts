export function wireCopy(root: ParentNode = document): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-copy]"
  )) {
    if (button.dataset.wired === "1") {
      continue;
    }

    button.dataset.wired = "1";
    button.addEventListener("click", () => {
      void (async () => {
        const shell = button.closest("div");

        const command = shell
          ?.querySelector("[data-command]")
          ?.textContent?.trim();

        if (command === undefined || command === "") {
          return;
        }

        try {
          await navigator.clipboard.writeText(command);
          const previous = button.textContent;
          button.textContent = "Copied";
          window.setTimeout(() => {
            button.textContent = previous;
          }, 1400);
        } catch {
          button.textContent = "Failed";
        }
      })();
    });
  }
}

wireCopy();

document.addEventListener("astro:page-load", () => {
  wireCopy();
});
