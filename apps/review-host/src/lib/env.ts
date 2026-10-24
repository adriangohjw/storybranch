export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(`missing ${name}`);
  }

  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return undefined;
  }

  return value;
}

export function appUrl(): string {
  return requiredEnv("STORYBRANCH_APP_URL").replace(/\/$/u, "");
}
