import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      duration={2200}
      position="bottom-center"
      toastOptions={{
        classNames: {
          closeButton: "bg-paper-2! border-ink/10! text-ink-muted!",
          title: "text-sm! font-medium!",
          toast:
            "font-sans! bg-ink! text-paper! border-ink/10! shadow-lg! rounded-lg!",
        },
      }}
    />
  );
}
