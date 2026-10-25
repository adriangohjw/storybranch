import { BrandLockup } from "@storybranch/brand";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { demoEnabled, demoNotFoundResponse } from "~/lib/demo.shared";

export const Route = createFileRoute("/demo")({
  beforeLoad: () => {
    if (!demoEnabled()) {
      throw demoNotFoundResponse();
    }
  },
  component: DemoLayout,
});

function DemoLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <p className="text-sm font-semibold tracking-tight">
          <BrandLockup>storybranch review</BrandLockup>
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Public read-only demo of hosted visual review.
        </p>
      </header>
      <Outlet />
    </div>
  );
}
