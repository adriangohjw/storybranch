import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";

const Box = () => (
  <div style={{ background: "#e2e8f0", height: 40, width: 40 }} />
);

function Boom(): never {
  throw new Error("fixture boom");
}

const Raf = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    let frame = 0;
    let raf = 0;

    if (el) {
      const tick = () => {
        frame += 1;
        el.style.background = `rgb(${frame % 255}, 0, 0)`;
        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} style={{ background: "#111111", height: 40, width: 40 }} />
  );
};

const meta = {
  component: Box,
  title: "Errors",
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Both: Story = {
  parameters: {
    chromatic: {
      modes: { a: { viewport: 100 } },
      viewports: [200],
    },
  },
};

export const Unknown: Story = {
  parameters: {
    chromatic: { modes: { phone: { viewport: "nope" } } },
  },
};

export const Invalid: Story = {
  parameters: {
    chromatic: { modes: { bad: { viewport: true } } },
  },
};

export const NotPx: Story = {
  parameters: {
    chromatic: { modes: { broken: { viewport: "broken" } } },
    viewport: {
      options: {
        broken: { styles: { height: "100px", width: "100%" } },
      },
    },
  },
};

export const Throws: Story = {
  render: () => <Boom />,
};

export const RafLoop: Story = {
  render: () => <Raf />,
};
