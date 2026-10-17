import { toast } from "sonner";

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
          toast.success("Copied to clipboard");
        } catch {
          toast.error("Could not copy");
        }
      })();
    });
  }
}

wireCopy();

document.addEventListener("astro:page-load", () => {
  wireCopy();
});
