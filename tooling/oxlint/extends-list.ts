export function extendsList(config: { extends?: unknown }): unknown[] {
  const value = config.extends;

  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
