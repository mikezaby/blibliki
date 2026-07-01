import { Encoder } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta = {
  title: "Primitives/Encoder",
  component: Encoder,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A flat, token-driven encoder with a single progress arc. Drag vertically to adjust quickly across the range, or hold Shift for 8× finer control. The current value is displayed below the dial.",
      },
    },
  },
  args: {
    name: "Drive",
    min: 0,
    max: 1,
    step: 0.01,
    value: 0.42,
    size: "md",
    disabled: false,
  },
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
    onChange: {
      control: false,
    },
    formatValue: {
      control: false,
    },
  },
} satisfies Meta<typeof Encoder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    size: "lg",
  },

  render: (args) => {
    const [value, setValue] = useState(Number(args.value ?? 0));

    useEffect(() => {
      setValue(Number(args.value ?? 0));
    }, [args.value]);

    return (
      <Encoder
        {...args}
        value={value}
        onChange={(nextValue) => {
          setValue(nextValue);
        }}
      />
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="sb-row">
      <Encoder
        name="Rate xs"
        value={0.2}
        min={0}
        max={1}
        step={0.01}
        size="xs"
      />
      <Encoder
        name="Rate small"
        value={0.4}
        min={0}
        max={1}
        step={0.01}
        size="sm"
      />
      <Encoder
        name="Rate medium"
        value={0.68}
        min={0}
        max={1}
        step={0.01}
        size="md"
      />
      <Encoder
        name="Rate large"
        value={0.85}
        min={0}
        max={1}
        step={0.01}
        size="lg"
      />
    </div>
  ),
};

export const Ranges: Story = {
  render: () => (
    <div className="sb-row">
      <Encoder name="BPM" value={122} min={40} max={240} step={1} />
      <Encoder
        name="Filter cutoff"
        value={1800}
        min={20}
        max={20000}
        step={1}
        exp={5}
        formatValue={(value) => `${Math.round(value)} Hz`}
      />
      <Encoder
        name="Decay"
        value={1.4}
        min={0.01}
        max={4}
        step={0.01}
        formatValue={(value) => `${value.toFixed(2)} s`}
      />
    </div>
  ),
};

export const PrecisionDrag: Story = {
  render: () => {
    const [value, setValue] = useState(0.5);

    return (
      <div className="sb-stack">
        <Encoder
          name="Precision drive"
          value={value}
          min={0}
          max={1}
          step={0.01}
          onChange={setValue}
        />
        <p>Drag vertically. Hold Shift while dragging for fine adjustment.</p>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <Encoder
      name="Disabled drive"
      value={0.56}
      min={0}
      max={1}
      step={0.01}
      disabled
    />
  ),
};
