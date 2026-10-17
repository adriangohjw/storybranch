export interface ViewportOption {
  styles: { width: string; height: string };
}

export interface PlanInput {
  parameters: {
    chromatic?: {
      disable?: boolean;
      disableSnapshot?: boolean;
      delay?: number;
      pauseAnimationAtEnd?: boolean;
      diffThreshold?: number;
      diffIncludeAntiAliasing?: boolean;
      cropToViewport?: boolean;
      modes?: Record<string, Record<string, unknown>>;
      viewports?: number[];
    };
    viewport?: { options?: Record<string, ViewportOption> };
  };
  globals: { viewport?: { value?: string; isRotated?: boolean } };
}

export interface Shot {
  label: string;
  width: number;
  height: number;
  globals: Record<string, unknown>;
  delay: number;
  pauseAtEnd: boolean;
  threshold: number;
  includeAA: boolean;
  cropToViewport: boolean;
}

export type Plan = { skip: true } | { error: string } | { shots: Shot[] };

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 900;

// Storybook's viewport addon uses these when parameters.viewport.options is unset.
const MINIMAL_VIEWPORTS: Record<string, ViewportOption> = {
  desktop: { styles: { height: "1024px", width: "1280px" } },
  mobile1: { styles: { height: "568px", width: "320px" } },
  mobile2: { styles: { height: "896px", width: "414px" } },
  tablet: { styles: { height: "1112px", width: "834px" } },
};

export function isCapturable(entry: {
  type: string;
  tags?: string[];
}): boolean {
  const tags = entry.tags ?? [];
  // Storybook 10 stores `!test` by omitting the automatic `test` tag.
  return (
    entry.type === "story" && tags.includes("test") && !tags.includes("!test")
  );
}

export function shotFilename(storyId: string, label: string): string {
  return `${storyId}__${label.replaceAll(/[\\/]/gu, "_")}.png`;
}

function captureFlags(chromatic: PlanInput["parameters"]["chromatic"]) {
  return {
    cropToViewport: chromatic?.cropToViewport ?? false,
    delay: chromatic?.delay ?? 0,
    includeAA: chromatic?.diffIncludeAntiAliasing ?? false,
    pauseAtEnd: chromatic?.pauseAnimationAtEnd ?? true,
    threshold: chromatic?.diffThreshold ?? 0.1,
  };
}

function planModes(
  modes: Record<string, Record<string, unknown>>,
  input: PlanInput,
  flags: ReturnType<typeof captureFlags>
): Plan {
  const shots: Shot[] = [];
  for (const [label, mode] of Object.entries(modes)) {
    const shot = shotForMode(label, mode, input, flags);
    if ("error" in shot) {
      return shot;
    }
    shots.push(shot);
  }
  return { shots };
}

function planWidths(
  widths: number[],
  flags: ReturnType<typeof captureFlags>
): Plan {
  return {
    shots: widths.map((width) => ({
      globals: {},
      height: DEFAULT_HEIGHT,
      label: String(width),
      width,
      ...flags,
    })),
  };
}

function planSingle(
  input: PlanInput,
  flags: ReturnType<typeof captureFlags>
): Plan {
  const pinned = input.globals.viewport?.value;
  if (pinned !== undefined && pinned.length > 0) {
    const size = lookupViewport(pinned, input);
    if ("error" in size) {
      return size;
    }
    const rotated = input.globals.viewport?.isRotated ?? false;
    return {
      shots: [
        {
          globals: {},
          height: rotated ? size.width : size.height,
          label: pinned,
          width: rotated ? size.height : size.width,
          ...flags,
        },
      ],
    };
  }

  return {
    shots: [
      {
        globals: {},
        height: DEFAULT_HEIGHT,
        label: `${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}`,
        width: DEFAULT_WIDTH,
        ...flags,
      },
    ],
  };
}

export function planShots(input: PlanInput): Plan {
  const { chromatic } = input.parameters;
  if (chromatic?.disable === true || chromatic?.disableSnapshot === true) {
    return { skip: true };
  }

  const flags = captureFlags(chromatic);
  if (chromatic?.modes !== undefined && chromatic.viewports !== undefined) {
    return { error: "chromatic.modes and chromatic.viewports are both set" };
  }
  if (chromatic?.modes !== undefined) {
    return planModes(chromatic.modes, input, flags);
  }
  if (chromatic?.viewports !== undefined) {
    return planWidths(chromatic.viewports, flags);
  }
  return planSingle(input, flags);
}

function shotForMode(
  label: string,
  mode: Record<string, unknown>,
  input: PlanInput,
  flags: Omit<Shot, "label" | "width" | "height" | "globals">
): Shot | { error: string } {
  const { viewport } = mode;
  const globals: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(mode)) {
    if (key !== "viewport") {
      globals[key] = value;
    }
  }

  if (viewport === undefined) {
    return {
      globals,
      height: DEFAULT_HEIGHT,
      label,
      width: DEFAULT_WIDTH,
      ...flags,
    };
  }
  if (typeof viewport === "number") {
    return {
      globals,
      height: DEFAULT_HEIGHT,
      label,
      width: viewport,
      ...flags,
    };
  }
  if (typeof viewport === "string") {
    const size = lookupViewport(viewport, input);
    if ("error" in size) {
      return size;
    }
    globals.viewport = { isRotated: false, value: viewport };
    return { globals, height: size.height, label, width: size.width, ...flags };
  }
  if (isViewportSize(viewport)) {
    return {
      globals,
      height: viewport.height ?? DEFAULT_HEIGHT,
      label,
      width: viewport.width,
      ...flags,
    };
  }
  return { error: `invalid viewport for mode ${label}` };
}

function lookupViewport(
  name: string,
  input: PlanInput
): { width: number; height: number } | { error: string } {
  const options = input.parameters.viewport?.options ?? MINIMAL_VIEWPORTS;
  const option = options[name];
  if (option === undefined) {
    return { error: `unknown viewport ${name}` };
  }
  const width = pixels(option.styles.width, name, "width");
  const height = pixels(option.styles.height, name, "height");
  if (typeof width !== "number") {
    return width;
  }
  if (typeof height !== "number") {
    return height;
  }
  return { height, width };
}

function pixels(
  value: string,
  name: string,
  axis: "width" | "height"
): number | { error: string } {
  const match = /^(?<size>\d+(?:\.\d+)?)px$/u.exec(value.trim());
  const size = match?.groups?.size;
  if (size === undefined) {
    return { error: `viewport ${name} ${axis} is not px` };
  }
  return Math.round(Number(size));
}

function isViewportSize(
  value: unknown
): value is { width: number; height?: number } {
  if (typeof value !== "object" || value === null || !("width" in value)) {
    return false;
  }
  return typeof value.width === "number";
}
