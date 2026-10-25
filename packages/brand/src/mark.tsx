import type { ReactNode } from "react";

const STRIPE_CLASS = "inline-block h-3.5 w-2 rounded-[2px] shrink-0";

/** Three vertical proof-tone stripes — same mark as hosted-review shell/login. */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className ?? "inline-flex items-center gap-0.5"}
    >
      <span className={`${STRIPE_CLASS} bg-amber-400`} />
      <span className={`${STRIPE_CLASS} bg-emerald-700`} />
      <span className={`${STRIPE_CLASS} bg-red-600`} />
    </span>
  );
}

export function BrandLockup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ?? "inline-flex items-center gap-2"}>
      <Mark />
      {children}
    </span>
  );
}
