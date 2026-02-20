import { OptionSelect, type OptionSelectProps } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const stringOptions = ["Sine", "Triangle", "Square", "Saw"];
const idOptions = [
  { id: "patch-1", name: "Warm Pad" },
  { id: "patch-2", name: "Sharp Bass" },
  { id: "patch-3", name: "Soft Lead" },
];
const numericOptions = [1, 2, 3, 4];
const longLabelOptions = [
  {
    id: "very-long-option",
    name: "Extremely Long Wavetable Preset Name With Many Words",
  },
  { id: "short", name: "Short" },
];

const meta = {
  title: "Primitives/OptionSelect",
  component: OptionSelect,
  tags: ["autodocs"],
} satisfies Meta<typeof OptionSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function StringDemo(props: Omit<OptionSelectProps<string>, "onChange">) {
  const [value, setValue] = useState(props.value);

  return (
    <OptionSelect
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
      }}
    />
  );
}

function NumberDemo(props: Omit<OptionSelectProps<number>, "onChange">) {
  const [value, setValue] = useState(props.value);

  return (
    <OptionSelect
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
      }}
    />
  );
}

function OptionalStringDemo(
  props: Omit<OptionSelectProps<string | undefined>, "onChange">,
) {
  const [value, setValue] = useState<string | undefined>(props.value);

  return (
    <OptionSelect
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
      }}
    />
  );
}

export const StringOptions: Story = {
  render: () => (
    <StringDemo
      label="Waveform"
      value="Sine"
      options={stringOptions}
      triggerClassName="w-[220px]"
    />
  ),
};

export const IdOptions: Story = {
  render: () => (
    <StringDemo
      label="Patch"
      value="patch-2"
      options={idOptions}
      triggerClassName="w-[220px]"
    />
  ),
};

export const NumericOptions: Story = {
  render: () => (
    <NumberDemo
      label="Voices"
      value={2}
      options={numericOptions}
      triggerClassName="w-[220px]"
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <StringDemo
      label="Disabled"
      value="Sine"
      options={stringOptions}
      disabled
      triggerClassName="w-[220px]"
    />
  ),
};

export const Placeholder: Story = {
  render: () => (
    <OptionalStringDemo options={stringOptions} value={undefined} triggerClassName="w-[220px]" />
  ),
};

export const LongSelectedText: Story = {
  render: () => (
    <StringDemo
      label="Preset"
      value="very-long-option"
      options={longLabelOptions}
      triggerClassName="w-[180px]"
    />
  ),
};
