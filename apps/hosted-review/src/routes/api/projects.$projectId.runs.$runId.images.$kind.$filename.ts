import { createFileRoute } from "@tanstack/react-router";

import { actualKey, baselineKey, diffKey, safeFilename } from "~/lib/keys";
import { pngResponse } from "~/lib/png-response";
import { objects } from "~/lib/s3.server";
import { loadSessionUser } from "~/lib/session.server";

export const Route = createFileRoute(
  "/api/projects/$projectId/runs/$runId/images/$kind/$filename"
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const user = await loadSessionUser();

        if (user === null) {
          return new Response("unauthorized", { status: 401 });
        }

        if (!safeFilename(params.filename)) {
          return new Response("not found", { status: 404 });
        }

        const key =
          params.kind === "baseline"
            ? baselineKey(params.projectId, params.filename)
            : params.kind === "actual"
              ? actualKey(params.projectId, params.runId, params.filename)
              : params.kind === "diff"
                ? diffKey(params.projectId, params.runId, params.filename)
                : undefined;

        if (key === undefined) {
          return new Response("not found", { status: 404 });
        }

        const file = await objects().get(key);

        if (file === undefined) {
          return new Response("not found", { status: 404 });
        }

        return pngResponse(file);
      },
    },
  },
});
