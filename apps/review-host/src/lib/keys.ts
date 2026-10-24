export interface ObjectStore {
  get(key: string): Promise<Buffer | undefined>;
  list(prefix: string): Promise<string[]>;
  put(key: string, body: Buffer, contentType?: string): Promise<void>;
}

export function baselineKey(projectId: string, filename: string): string {
  return `projects/${projectId}/baseline/${filename}`;
}

export function actualKey(
  projectId: string,
  runId: string,
  filename: string
): string {
  return `projects/${projectId}/runs/${runId}/actual/${filename}`;
}

export function diffKey(
  projectId: string,
  runId: string,
  filename: string
): string {
  return `projects/${projectId}/runs/${runId}/diff/${filename}`;
}

export function memoryStore(): ObjectStore {
  const map = new Map<string, Buffer>();

  return {
    async get(key) {
      return map.get(key);
    },
    async list(prefix) {
      return [...map.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length));
    },
    async put(key, body) {
      map.set(key, body);
    },
  };
}

export async function acceptActualAsBaseline(
  store: ObjectStore,
  projectId: string,
  runId: string,
  filename: string
): Promise<void> {
  const actual = await store.get(actualKey(projectId, runId, filename));

  if (actual === undefined) {
    throw new Error(`missing actual ${filename}`);
  }

  await store.put(baselineKey(projectId, filename), actual, "image/png");
}

export function safeFilename(filename: string): boolean {
  return (
    filename.length > 0 &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !filename.includes("..") &&
    filename.endsWith(".png")
  );
}
