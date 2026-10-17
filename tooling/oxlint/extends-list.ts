import type { OxlintConfig } from "oxlint";

export function extendsList(config: {
  extends?: OxlintConfig | OxlintConfig[];
}): OxlintConfig[] {
  const value = config.extends;

  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
