import type { SyntheticEvent } from "react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/cn.ts";

interface SnapshotFrameProps {
  alt: string;
  className?: string;
  emptyLabel?: string;
  overlayAlt?: string;
  overlaySrc?: string;
  src?: string;
}

export const SnapshotFrame = ({
  alt,
  className,
  emptyLabel = "No image",
  overlayAlt = "",
  overlaySrc,
  src,
}: SnapshotFrameProps) => {
  const [aspectRatio, setAspectRatio] = useState<string | undefined>();

  const onImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
    }
  }, []);

  if (src === undefined || src.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-32 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-8 text-center text-xs text-zinc-500",
          className
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "checker-surface relative min-h-32 w-full overflow-hidden rounded-md border border-zinc-800",
        className
      )}
      style={aspectRatio === undefined ? undefined : { aspectRatio }}
    >
      <img
        alt={alt}
        className="absolute inset-0 size-full object-contain"
        decoding="async"
        onLoad={onImageLoad}
        src={src}
      />
      {overlaySrc === undefined || overlaySrc.length === 0 ? null : (
        <img
          alt={overlayAlt}
          aria-hidden={overlayAlt.length === 0}
          className="pointer-events-none absolute inset-0 size-full object-contain opacity-80 mix-blend-normal"
          decoding="async"
          src={overlaySrc}
        />
      )}
    </div>
  );
};
