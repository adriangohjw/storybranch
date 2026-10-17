export interface ViewportOption {
  styles: { width: string; height: string };
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ChromaticMode {
  [key: string]: JsonValue;
}

export interface ShotGlobals {
  [key: string]: JsonValue;
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
      modes?: { [mode: string]: ChromaticMode };
      viewports?: number[];
    };
    viewport?: { options?: { [name: string]: ViewportOption } };
  };
  globals: { viewport?: { value?: string; isRotated?: boolean } };
}

export interface Shot {
  label: string;
  width: number;
  height: number;
  globals: ShotGlobals;
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
const MINIMAL_VIEWPORTS = {
  desktop: { styles: { height: "1024px", width: "1280px" } },
  mobile1: { styles: { height: "568px", width: "320px" } },
  mobile2: { styles: { height: "896px", width: "414px" } },
  tablet: { styles: { height: "1112px", width: "834px" } },
} satisfies { [name: string]: ViewportOption };

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
  modes: { [mode: string]: ChromaticMode },
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
  mode: ChromaticMode,
  input: PlanInput,
  flags: Omit<Shot, "label" | "width" | "height" | "globals">
): Shot | { error: string } {
  const { viewport } = mode;
  const globals: ShotGlobals = {};

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

  if (isModeViewportNumber(viewport)) {
    return {
      globals,
      height: DEFAULT_HEIGHT,
      label,
      width: viewport,
      ...flags,
    };
  }

  if (isModeViewportString(viewport)) {
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
  const options: { [name: string]: ViewportOption } =
    input.parameters.viewport?.options ?? MINIMAL_VIEWPORTS;

  const option = options[name];

  if (option === undefined) {
    return { error: `unknown viewport ${name}` };
  }

  const width = pixels(option.styles.width, name, "width");
  const height = pixels(option.styles.height, name, "height");

  if (isPixelParseError(width)) {
    return width;
  }

  if (isPixelParseError(height)) {
    return height;
  }

  return { height, width };
}

function isPixelParseError(
  result: number | { error: string }
): result is { error: string } {
  return typeof result === "object" && result !== null;
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

function isModeViewportNumber(value: JsonValue): value is number {
  return typeof value === "number";
}

function isModeViewportString(value: JsonValue): value is string {
  return typeof value === "string";
}

function isViewportSize(
  value: JsonValue
): value is { width: number; height?: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  if (!("width" in value)) {
    return false;
  }

  const { width, height } = value;

  if (typeof width !== "number") {
    return false;
  }

  return height === undefined || typeof height === "number";
}
