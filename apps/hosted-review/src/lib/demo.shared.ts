export const DEMO_RUN_ID = "10000000-0000-4000-8000-000000000001";

export function demoEnabled(
  runtimeEnv: Record<string, string | undefined> = process.env
): boolean {
  return runtimeEnv.STORYBRANCH_DEMO_ENABLED === "1";
}

export function demoNotFoundResponse(): Response {
  return new Response("not found", { status: 404 });
}

export function assertDemoRunId(runId: string): void {
  if (!demoEnabled() || runId !== DEMO_RUN_ID) {
    throw demoNotFoundResponse();
  }
}
