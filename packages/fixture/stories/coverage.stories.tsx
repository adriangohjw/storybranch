import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect as useReactEffect, useRef } from "react";
import { useEffect, useGlobals } from "storybook/preview-api";

const LIGHT = "#e2e8f0";
const DARK = "#111827";
const SETTLE_MS = 4000;

interface StoryGlobals {
  backgrounds?: { value?: string };
}

function darkFrom(globals: StoryGlobals): boolean {
  return globals.backgrounds?.value === "dark";
}

function storyRoot(): HTMLElement | null {
  const root = document.querySelector("#storybook-root");

  if (root instanceof HTMLElement) {
    return root;
  }

  return null;
}

function fillRoot(): void {
  const root = storyRoot();
  const { documentElement: html, body } = document;
  html.style.height = "100%";
  html.style.margin = "0";
  body.style.height = "100%";
  body.style.margin = "0";
  body.style.padding = "0";

  if (root) {
    root.style.height = "100%";
    root.style.width = "100%";
  }
}

function useCanvas(label: string) {
  useEffect(fillRoot, []);
  const [globals] = useGlobals();
  const dark = darkFrom(globals);

  return (
    <div
      style={{
        background: dark ? DARK : LIGHT,
        boxSizing: "border-box",
        color: dark ? LIGHT : DARK,
        font: "16px/1.2 ui-sans-serif, system-ui, sans-serif",
        height: "100%",
        width: "100%",
      }}
    >
      {label}
    </div>
  );
}

const Motion = () => {
  useReactEffect(fillRoot, []);

  return (
    <>
      <style>
        {`@keyframes fixture-end { from { background: #00ff00 } to { background: #ff0000 } }`}
      </style>
      <div
        style={{
          animation: "fixture-end 1s linear forwards",
          height: "100%",
          width: "100%",
        }}
      />
    </>
  );
};

const Late = () => {
  const ref = useRef<HTMLDivElement>(null);

  useReactEffect(() => {
    fillRoot();
    const el = ref.current;
    let raf = 0;

    if (el) {
      const started = performance.now();

      const tick = () => {
        const age = performance.now() - started;

        if (age < SETTLE_MS) {
          el.style.background =
            Math.floor(age / 50) % 2 === 0 ? "#111111" : "#222222";
          raf = requestAnimationFrame(tick);
        } else {
          el.style.background = "#0000ff";
        }
      };

      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ background: "#111111", height: "100%", width: "100%" }}
    />
  );
};

const Tall = () => {
  useReactEffect(() => {
    fillRoot();
    const root = storyRoot();

    if (root) {
      root.style.width = "2000px";
      root.style.height = "2000px";
    }
  }, []);

  return (
    <div style={{ background: "#123456", height: "100%", width: "100%" }} />
  );
};

const Dot = () => {
  useReactEffect(() => {
    const root = storyRoot();
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    if (root) {
      root.style.width = "4px";
      root.style.height = "4px";
    }
  }, []);

  return (
    <div style={{ background: "#ffffff", height: "100%", width: "100%" }} />
  );
};

const TypeSample = () => (
  <p
    style={{
      font: "16px/1.2 'DejaVu Sans', sans-serif",
      margin: 0,
      width: 200,
    }}
  >
    Catch UI drift before it ships
  </p>
);

function CoverageStory({ label = "" }: { label?: string }) {
  return useCanvas(label);
}

const meta = {
  render: CoverageStory,
  title: "Coverage",
} satisfies Meta<{ label?: string }>;

export default meta;

type Story = StoryObj<typeof meta>;

const wide = {
  styles: { height: "700px", width: "1440px" },
};

const odd = {
  styles: { height: "100.2px", width: "320.6px" },
};

export const Default: Story = { args: { label: "default" } };

export const PinnedMobile1: Story = {
  args: { label: "mobile1" },
  globals: { viewport: { isRotated: false, value: "mobile1" } },
};

export const PinnedRotated: Story = {
  args: { label: "rotated" },
  globals: { viewport: { isRotated: true, value: "mobile1" } },
};

export const PinnedDesktop: Story = {
  args: { label: "desktop" },
  globals: { viewport: { isRotated: false, value: "desktop" } },
};

export const PinnedMobile2: Story = {
  args: { label: "mobile2" },
  globals: { viewport: { isRotated: false, value: "mobile2" } },
};

export const PinnedTablet: Story = {
  args: { label: "tablet" },
  globals: { viewport: { isRotated: false, value: "tablet" } },
};

export const PinnedWide: Story = {
  args: { label: "wide" },
  globals: { viewport: { isRotated: false, value: "wide" } },
  parameters: { viewport: { options: { wide } } },
};

export const PinnedOdd: Story = {
  args: { label: "odd" },
  globals: { viewport: { isRotated: false, value: "odd" } },
  parameters: { viewport: { options: { odd } } },
};

export const Widths: Story = {
  args: { label: "widths" },
  parameters: { chromatic: { viewports: [320, 1200] } },
};

export const ModeWidths: Story = {
  args: { label: "mode widths" },
  parameters: {
    chromatic: {
      modes: {
        narrow: { viewport: 320 },
        wide: { viewport: 800 },
      },
    },
  },
};

export const ModeTheme: Story = {
  args: { label: "theme" },
  parameters: {
    chromatic: {
      modes: {
        dark: { backgrounds: { value: "dark" } },
        light: { backgrounds: { value: "light" } },
      },
    },
  },
};

export const ModeNamed: Story = {
  args: { label: "named" },
  parameters: {
    chromatic: {
      modes: {
        phone: { backgrounds: { value: "dark" }, viewport: "mobile1" },
      },
    },
  },
};

export const ModeBox: Story = {
  args: { label: "box" },
  parameters: {
    chromatic: {
      modes: { card: { viewport: { height: 200, width: 400 } } },
    },
  },
};

export const ModeWidthOnly: Story = {
  args: { label: "half" },
  parameters: {
    chromatic: {
      modes: { half: { viewport: { width: 500 } } },
    },
  },
};

export const ModeSlash: Story = {
  args: { label: "slash" },
  parameters: {
    chromatic: {
      modes: {
        "dark/mobile": { backgrounds: { value: "dark" }, viewport: 360 },
      },
    },
  },
};

export const ModeSeveral: Story = {
  args: { label: "several" },
  parameters: {
    chromatic: {
      modes: {
        dark: { backgrounds: { value: "dark" } },
        mid: { viewport: 640 },
        narrow: { viewport: 320 },
        wide: { viewport: 1000 },
      },
    },
  },
};

export const EmptyModes: Story = {
  args: { label: "empty modes" },
  parameters: { chromatic: { modes: {} } },
};

export const EmptyWidths: Story = {
  args: { label: "empty widths" },
  parameters: { chromatic: { viewports: [] } },
};

export const Disabled: Story = {
  args: { label: "disabled" },
  parameters: { chromatic: { disable: true } },
};

export const DisabledSnapshot: Story = {
  args: { label: "disabled snapshot" },
  parameters: { chromatic: { disableSnapshot: true } },
};

export const DisabledWithModes: Story = {
  args: { label: "disabled wins" },
  parameters: {
    chromatic: {
      disable: true,
      modes: { narrow: { viewport: 320 } },
    },
  },
};

export const Delayed: Story = {
  parameters: { chromatic: { delay: SETTLE_MS + 500 } },
  render: () => <Late />,
};

export const PauseAtEnd: Story = {
  parameters: { chromatic: { pauseAnimationAtEnd: true } },
  render: () => <Motion />,
};

export const PauseAtStart: Story = {
  parameters: { chromatic: { pauseAnimationAtEnd: false } },
  render: () => <Motion />,
};

export const Cropped: Story = {
  parameters: { chromatic: { cropToViewport: true } },
  render: () => <Tall />,
};

export const Uncropped: Story = {
  parameters: { chromatic: { cropToViewport: false } },
  render: () => <Tall />,
};

export const Threshold: Story = {
  args: { label: "threshold" },
  parameters: { chromatic: { diffThreshold: 0.2 } },
};

export const IncludeAa: Story = {
  args: { label: "aa" },
  parameters: {
    chromatic: { diffIncludeAntiAliasing: true, diffThreshold: 0.1 },
  },
};

export const Blank: Story = {
  render: () => <Dot />,
};

export const Type: Story = {
  render: () => <TypeSample />,
};

export const ManifestOnly: Story = {
  args: { label: "manifest" },
  tags: ["manifest"],
};
