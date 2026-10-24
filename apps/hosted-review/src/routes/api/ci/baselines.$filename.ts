import { createFileRoute } from "@tanstack/react-router";

import { getBaselineFile, projectForBearer } from "~/lib/ci.server";
import { pngResponse } from "~/lib/png-response";
import { objects } from "~/lib/s3.server";

export const Route = createFileRoute("/api/ci/baselines/$filename")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const project = await projectForBearer(
          request.headers.get("authorization")
        );

        if (project === undefined) {
          return new Response("unauthorized", { status: 401 });
        }

        const file = await getBaselineFile(
          objects(),
          project.id,
          params.filename
        );

        if (file === undefined) {
          return new Response("not found", { status: 404 });
        }

        return pngResponse(file);
      },
    },
  },
});
