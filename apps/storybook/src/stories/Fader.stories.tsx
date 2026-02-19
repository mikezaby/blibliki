import * as React from "react";
import { Fader, type FaderProps, type MarkProps } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const modeMarks: MarkProps[] = [
  { value: 0, label: "Off" },
  { value: 1, label: "Low" },
  { value: 2, label: "Mid" },
  { value: 3, label: "High" },
];

type ControlledFaderProps = Omit<FaderProps, "onChange">;

function ControlledFader(args: ControlledFaderProps) {
  const [value, setValue] = React.useState(args.value ?? args.defaultValue ?? args.min ?? 0);

  React.useEffect(() => {
    if (args.value !== undefined) {
      setValue(args.value);
    }
  }, [args.value]);

  return (
    <Fader
      {...args}
      value={value}
      onChange={(_sliderValue, calculatedValue) => {
        setValue(calculatedValue);
      }}
    />
  );
}

const meta = {
  title: "Primitives/Fader",
  component: Fader,
  tags: ["autodocs"],
  args: {
    name: "Gain",
    min: 0,
    max: 1,
    step: 0.01,
    value: 0.5,
    orientation: "vertical",
    hideMarks: true,
  },
  argTypes: {
    orientation: {
      control: "select",
      options: ["vertical", "horizontal"],
    },
    marks: {
      control: false,
    },
    onChange: {
      control: false,
    },
  },
} satisfies Meta<typeof Fader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <ControlledFader {...args} />,
};

export const WithMarks: Story = {
  args: {
    name: "Mode",
    value: 2,
    marks: modeMarks,
    hideMarks: false,
  },
  render: (args) => <ControlledFader {...args} />,
};

export const Horizontal: Story = {
  args: {
    name: "Pan",
    min: -1,
    max: 1,
    step: 0.01,
    value: 0,
    orientation: "horizontal",
    hideMarks: true,
  },
  render: (args) => (
    <div style={{ width: "18rem" }}>
      <ControlledFader {...args} />
    </div>
  ),
};

export const Exponential: Story = {
  args: {
    name: "Frequency",
    min: 20,
    max: 20000,
    value: 440,
    exp: 2,
    hideMarks: true,
  },
  render: (args) => <ControlledFader {...args} />,
};
