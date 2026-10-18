import type { Meta, StoryObj } from "@storybook/react-vite";

const Box = () => (
  <div style={{ background: "#c2410c", height: 40, width: 80 }} />
);

const meta = {
  component: Box,
  title: "Smoke",
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
