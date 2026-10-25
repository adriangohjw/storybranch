import { createServerFn } from "@tanstack/react-start";

import { demoRunPayload, type DemoRunPayload } from "~/lib/demo.server";
import {
  assertDemoRunId,
  demoNotFoundResponse,
} from "~/lib/demo.shared";

export const loadDemoRun = createServerFn({ method: "GET" })
  .validator((data: { runId: string }) => data)
  .handler(async ({ data }): Promise<DemoRunPayload> => {
    try {
      assertDemoRunId(data.runId);
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }

      throw demoNotFoundResponse();
    }

    return demoRunPayload();
  });
