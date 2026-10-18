import { toast } from "sonner";

interface CopyCommandProps {
  className?: string;
  command: string;
  compact?: boolean;
  prompt?: boolean;
  scrollable?: boolean;
}

export function CopyCommand({
  command,
  className = "",
  compact = false,
  prompt = true,
  scrollable = false,
}: CopyCommandProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div
      className={`group border-ink/10 bg-surface flex flex-col rounded-lg border shadow-sm sm:flex-row sm:items-start ${className}`}
    >
      <code
        className={`text-ink min-w-0 flex-1 font-mono break-words whitespace-pre-wrap ${
          compact
            ? "px-3 py-2 text-[11px] leading-snug sm:px-4 sm:py-3 sm:text-[13px] sm:leading-relaxed"
            : "px-4 py-3 text-[13px] leading-relaxed sm:text-sm"
        } ${scrollable ? "max-h-36 overflow-y-auto sm:max-h-52 lg:max-h-none" : ""}`}
      >
        {prompt ? <span className="text-moss select-none">$ </span> : null}
        {command}
      </code>
      <button
        aria-label="Copy command"
        className={`border-ink/10 bg-paper-2/60 text-ink-muted hover:bg-paper-2 hover:text-ink shrink-0 font-semibold tracking-wide transition-colors ${
          compact
            ? "border-t px-3 py-2 text-[10px] sm:self-stretch sm:border-t-0 sm:border-l sm:px-4 sm:py-3 sm:text-xs"
            : "border-t px-4 py-2.5 text-xs sm:self-stretch sm:border-t-0 sm:border-l sm:py-3"
        }`}
        onClick={() => {
          void copy();
        }}
        type="button"
      >
        Copy
      </button>
    </div>
  );
}
