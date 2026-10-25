import { createFileRoute } from "@tanstack/react-router";

import {
  readDemoImage,
  type DemoImageKind,
} from "~/lib/demo.server";
import { assertDemoRunId, demoNotFoundResponse } from "~/lib/demo.shared";
import { pngResponse } from "~/lib/png-response";

function demoImageKind(value: string): DemoImageKind | undefined {
  if (value === "baseline" || value === "actual" || value === "diff") {
    return value;
  }

  return undefined;
}

export const Route = createFileRoute(
  "/api/demo/runs/$runId/images/$kind/$filename"
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          assertDemoRunId(params.runId);
        } catch (error) {
          if (error instanceof Response) {
            return error;
          }

          return demoNotFoundResponse();
        }

        const kind = demoImageKind(params.kind);

        if (kind === undefined) {
          return demoNotFoundResponse();
        }

        const file = await readDemoImage(kind, params.filename);

        if (file === undefined) {
          return demoNotFoundResponse();
        }

        return pngResponse(file);
      },
    },
  },
});
