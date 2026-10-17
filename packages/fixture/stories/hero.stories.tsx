import type { Meta, StoryObj } from "@storybook/react-vite";

const revised = false;

const Hero = () => (
  <section
    style={{
      background: "#f6f3ee",
      borderRadius: 16,
      boxSizing: "border-box",
      color: "#14181f",
      display: "grid",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      gap: 24,
      gridTemplateColumns: "1fr 240px",
      height: 320,
      overflow: "hidden",
      padding: 28,
      width: "100%",
    }}
  >
    <div>
      <p
        style={{
          color: "#c2410c",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          margin: 0,
        }}
      >
        STORYBOOK VISUALS
      </p>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          margin: "12px 0 0",
          maxWidth: 420,
        }}
      >
        Catch UI drift before it ships
      </h1>
      <p
        style={{
          color: "#4a5568",
          fontSize: 15,
          lineHeight: 1.45,
          margin: "12px 0 0",
          maxWidth: 420,
        }}
      >
        Pixel-diff stories locally and review them in the browser.
      </p>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}
      >
        <button
          style={{
            background: revised ? "#1d4ed8" : "#c2410c",
            border: 0,
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 16px",
          }}
          type="button"
        >
          Review diff
        </button>
        <button
          style={{
            background: "transparent",
            border: "1px solid #d4d4d8",
            borderRadius: 8,
            color: "#14181f",
            fontSize: 14,
            padding: "10px 16px",
          }}
          type="button"
        >
          Docs
        </button>
      </div>
    </div>
    <aside
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgb(20 24 31 / 8%)",
        padding: 16,
      }}
    >
      <p style={{ color: "#71717a", fontSize: 12, margin: 0 }}>Preview</p>
      <div
        style={{
          background: "#c2410c",
          borderRadius: 8,
          color: "#fff",
          fontSize: 14,
          marginTop: 12,
          padding: "12px 14px",
        }}
      >
        Button / Primary
      </div>
      <p style={{ color: "#a16207", fontSize: 13, margin: "12px 0 0" }}>
        changed · {revised ? "48" : "142"} px
      </p>
    </aside>
  </section>
);

const meta = {
  component: Hero,
  title: "Hero",
} satisfies Meta<typeof Hero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pinned: Story = {
  globals: {
    viewport: { isRotated: false, value: "mobile1" },
  },
};

export const Modes: Story = {
  parameters: {
    chromatic: {
      modes: {
        narrow: { viewport: 320 },
        wide: { viewport: 800 },
      },
    },
  },
};

export const Skipped: Story = {
  tags: ["!test"],
};
