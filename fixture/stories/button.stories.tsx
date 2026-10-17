import type { Meta, StoryObj } from "@storybook/react-vite";

const Box = ({ label }: { label: string }) => (
  <div
    style={{
      background: "#c2410c",
      color: "white",
      fontFamily: "sans-serif",
      padding: 12,
    }}
  >
    {label}
  </div>
);

const meta = {
  args: { label: "storybranch" },
  component: Box,
  title: "Button",
} satisfies Meta<typeof Box>;

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
        tall: { viewport: { height: 200, width: 400 } },
        wide: { viewport: 800 },
      },
    },
  },
};

export const Skipped: Story = {
  tags: ["!test"],
};
