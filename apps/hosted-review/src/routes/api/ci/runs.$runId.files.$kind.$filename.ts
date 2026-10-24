import { createFileRoute } from "@tanstack/react-router";

import { projectForBearer, putRunFile } from "~/lib/ci.server";
import { objects } from "~/lib/s3.server";

export const Route = createFileRoute(
  "/api/ci/runs/$runId/files/$kind/$filename"
)({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        const project = await projectForBearer(
          request.headers.get("authorization")
        );

        if (project === undefined) {
          return new Response("unauthorized", { status: 401 });
        }

        try {
          await putRunFile(
            objects(),
            project.id,
            params.runId,
            params.kind,
            params.filename,
            Buffer.from(await request.arrayBuffer())
          );

          return new Response(null, { status: 204 });
        } catch (error) {
          return new Response(
            error instanceof Error ? error.message : "upload failed",
            { status: 400 }
          );
        }
      },
    },
  },
});
