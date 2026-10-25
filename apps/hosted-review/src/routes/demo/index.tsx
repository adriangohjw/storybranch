import { createFileRoute, redirect } from "@tanstack/react-router";

import { DEMO_RUN_ID } from "~/lib/demo.shared";

export const Route = createFileRoute("/demo/")({
  beforeLoad: () => {
    throw redirect({
      params: { runId: DEMO_RUN_ID },
      to: "/demo/runs/$runId",
    });
  },
});
