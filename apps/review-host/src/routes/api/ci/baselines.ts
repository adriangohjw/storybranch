import { createFileRoute } from "@tanstack/react-router";

import { listBaselineNames, projectForBearer } from "~/lib/ci.server";
import { objects } from "~/lib/s3.server";

export const Route = createFileRoute("/api/ci/baselines")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const project = await projectForBearer(
          request.headers.get("authorization")
        );

        if (project === undefined) {
          return new Response("unauthorized", { status: 401 });
        }

        return Response.json({
          files: await listBaselineNames(objects(), project.id),
        });
      },
    },
  },
});
