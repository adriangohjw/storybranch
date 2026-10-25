/** Cloudflare Worker bindings exposed as `globalThis.__env__` by Nitro. */
export interface HyperdriveBinding {
  connectionString: string;
}

export interface R2BucketBinding {
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  list(options?: { prefix?: string; cursor?: string }): Promise<R2ListResult>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<R2Object>;
}

interface R2Object {
  key: string;
}

interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2ListResult {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}

export interface HostedReviewWorkerBindings {
  HYPERDRIVE?: HyperdriveBinding;
  OBJECTS?: R2BucketBinding;
}

export function workerBindings(): HostedReviewWorkerBindings | undefined {
  const env = (globalThis as { __env__?: HostedReviewWorkerBindings }).__env__;

  return env;
}

export function hyperdriveConnectionString(): string | undefined {
  return workerBindings()?.HYPERDRIVE?.connectionString;
}

export function r2ObjectsBinding(): R2BucketBinding | undefined {
  return workerBindings()?.OBJECTS;
}
