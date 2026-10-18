import { usePackageManager } from "@/context/package-manager-context.tsx";
import { runPackageScript } from "@/lib/package-managers.ts";

export function TerminalDemo() {
  const { pm } = usePackageManager();
  const visual = runPackageScript("visual", pm);

  const lines = [
    visual,
    "storybranch review at http://127.0.0.1:4321",
    "missing baseline button--default__1200x900.png",
    "pixels button--modes__narrow.png",
  ];

  return (
    <div
      className="border-ink/15 bg-terminal min-w-0 overflow-hidden rounded-xl border text-left shadow-[0_24px_60px_-28px_rgb(20_24_31_/_0.55)]"
      aria-label="Example storybranch test output"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[11px] text-white/45">
          ~/my-app — storybranch
        </span>
      </div>
      <pre className="m-0 max-w-full overflow-x-auto p-4 font-mono text-[12px] leading-5 text-white sm:text-[13px] sm:leading-6">
        <span className="text-white">
          <span className="text-moss">$</span> {lines[0]}
        </span>
        {"\n"}
        <span className="text-[#7dd3c0]">{lines[1]}</span>
        {"\n"}
        <span className="text-warn">{lines[2]}</span>
        {"\n"}
        <span className="text-bad">{lines[3]}</span>
      </pre>
    </div>
  );
}
