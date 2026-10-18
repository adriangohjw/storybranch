import { usePackageManager } from "@/context/package-manager-context.tsx";
import { installCommand, runPackageScript } from "@/lib/package-managers.ts";

export function HowItWorksSection() {
  const { pm } = usePackageManager();
  const visual = runPackageScript("visual", pm);
  const review = runPackageScript("visual:review", pm);
  const approve = runPackageScript("visual:approve", pm);
  const storybook = installCommand("storybookDev", pm);

  const steps = [
    {
      body: "Start Storybook locally, or anywhere Chromium can reach it.",
      code: storybook,
      title: "Run Storybook",
    },
    {
      body: `${visual} walks the story index, writes PNGs, and compares them to committed baselines. Exit 1 means a shot needs attention.`,
      code: visual,
      title: "Capture & diff",
    },
    {
      body: "Reopen the review UI, or promote every actual into baseline/.",
      code: `${review}\n${approve}`,
      title: "Review or approve",
    },
  ];

  return (
    <section
      className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
      id="how"
    >
      <div className="max-w-2xl">
        <h2 className="font-syne text-ink text-3xl font-bold tracking-tight sm:text-4xl">
          Scripts in your app, then ship
        </h2>
        <p className="text-ink-muted mt-3 text-base sm:text-lg">
          Install with npm, pnpm, or bun (see{" "}
          <a
            className="text-ink decoration-ink/20 hover:decoration-ink/50 underline underline-offset-2"
            href="#install"
          >
            #install
          </a>
          ). No dashboard signup. Baselines are files you already know how to
          review in a PR.
        </p>
      </div>

      <ol className="mt-12 space-y-8">
        {steps.map((step, index) => (
          <li
            className="border-ink/10 grid gap-3 border-t pt-8 md:grid-cols-[140px_1fr] md:gap-8"
            key={step.title}
          >
            <p className="text-accent font-mono text-sm">Step {index + 1}</p>
            <div>
              <h3 className="font-syne text-ink text-xl font-bold">
                {step.title}
              </h3>
              <p className="text-ink-muted mt-2 max-w-2xl text-sm leading-relaxed sm:text-[15px]">
                {step.body}
              </p>
              <div className="border-ink/10 bg-terminal mt-4 rounded-lg border px-4 py-3 font-mono text-[12px] break-words whitespace-pre-wrap text-white/90 sm:text-[13px]">
                <span className="text-moss">$</span> {step.code}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
