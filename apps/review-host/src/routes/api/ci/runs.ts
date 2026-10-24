import { createFileRoute } from "@tanstack/react-router";

import { createRun, projectForBearer } from "~/lib/ci.server";

export const Route = createFileRoute("/api/ci/runs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const project = await projectForBearer(
          request.headers.get("authorization")
        );

        if (project === undefined) {
          return new Response("unauthorized", { status: 401 });
        }

        try {
          const body: unknown = await request.json();

          return Response.json(await createRun(project.id, body), {
            status: 201,
          });
        } catch (error) {
          return new Response(
            error instanceof Error ? error.message : "invalid run",
            { status: 400 }
          );
        }
      },
    },
  },
});
