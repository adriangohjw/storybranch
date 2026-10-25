import { createFileRoute } from "@tanstack/react-router";

import { PageError, PagePending } from "~/components/page-state";
import { ReadOnlyRun } from "~/components/read-only-run";
import { loadDemoRun } from "~/lib/demo.functions";
import { shortSha } from "~/lib/format";

export const Route = createFileRoute("/demo/runs/$runId")({
  component: DemoRunPage,
  errorComponent: ({ reset }) => (
    <PageError onRetry={reset} what="Couldn't load this demo run." />
  ),
  loader: async ({ params }) =>
    loadDemoRun({
      data: { runId: params.runId },
    }),
  pendingComponent: PagePending,
});

function DemoRunPage() {
  const { runId } = Route.useParams();
  const data = Route.useLoaderData();
  const imagePrefix = `/api/demo/runs/${runId}`;
  const title = runTitle(data.run.branch, data.run.commitSha, data.run.prNumber);

  return (
    <ReadOnlyRun
      imagePrefix={imagePrefix}
      report={data.report}
      review={data.review}
      run={data.run}
      title={title}
    />
  );
}

function runTitle(
  branch: string | null,
  commitSha: string,
  prNumber: number | null
): string {
  if (prNumber !== null) {
    return `PR ${prNumber.toString()}`;
  }

  if (branch !== null && branch.length <= 32) {
    return branch;
  }

  return shortSha(commitSha);
}
