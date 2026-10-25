import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export function PagePending() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3 p-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="mt-6 h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function PageError({
  onRetry,
  what,
}: {
  onRetry: () => void;
  what: string;
}) {
  return (
    <div className="space-y-3 p-6">
      <p className="text-destructive text-sm">{what}</p>
      <Button onClick={onRetry} type="button" variant="outline">
        Retry
      </Button>
    </div>
  );
}
