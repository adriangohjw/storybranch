import { usePackageManager } from "@/context/package-manager-context.tsx";
import { runPackageScript } from "@/lib/package-managers.ts";

export function FeaturesSection() {
  const { pm } = usePackageManager();
  const approve = runPackageScript("visual:approve", pm);

  const features = [
    {
      body: "Point storybranch at a running Storybook URL. Chromatic modes or viewports on a story become extra snapshots. Setting both on one story is an error.",
      command: "storybranch test --url …",
      title: "Your Storybook",
    },
    {
      body: "Commit .storybranch/baseline/. Leave actual/, diff/, and report.json untracked so pull requests show the images that matter.",
      command: ".storybranch/baseline/",
      title: "Baselines in git",
    },
    {
      body: `A first run exits 1 with a snapshot summary (new counts). That is the baseline set. ${approve} writes those PNGs.`,
      command: "snapshots need attention …",
      title: "First run",
    },
  ];

  return (
    <section
      className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
      id="features"
    >
      <div className="max-w-2xl">
        <h2 className="font-syne text-ink text-3xl font-bold tracking-tight sm:text-4xl">
          What you need before the first capture
        </h2>
        <p className="text-ink-muted mt-3 text-base sm:text-lg">
          Storybook on a URL Chromium can open, baselines as files, and a first
          run that is supposed to fail.
        </p>
      </div>
      <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {features.map((feature, index) => (
          <li className="relative min-w-0" key={feature.title}>
            <p className="text-accent font-mono text-xs font-medium tracking-widest uppercase">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="font-syne text-ink mt-3 text-xl font-bold">
              {feature.title}
            </h3>
            <p className="text-ink-muted mt-2 text-sm leading-relaxed sm:text-[15px]">
              {feature.body}
            </p>
            <p className="text-moss mt-4 font-mono text-xs break-all">
              {feature.command}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
