import { AutocompleteSelect, type AutocompleteSelectProps } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const targetOptions = [
  {
    name: "track-1 / filter.main / Cutoff",
    value: "track-1.filter.main.cutoff",
    searchText: "track-1 filter cutoff",
  },
  {
    name: "track-2 / filter.main / Cutoff",
    value: "track-2.filter.main.cutoff",
    searchText: "track-2 filter cutoff",
  },
  {
    name: "track-2 / source.main / Frequency",
    value: "track-2.source.main.frequency",
    searchText: "track-2 source oscillator frequency",
  },
  {
    name: "master / fx1.main / Mix",
    value: "master.fx1.main.mix",
    searchText: "master delay mix",
  },
];

const meta = {
  title: "Primitives/AutocompleteSelect",
  component: AutocompleteSelect,
  tags: ["autodocs"],
} satisfies Meta<typeof AutocompleteSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function StringDemo(
  props: Omit<AutocompleteSelectProps<string | undefined>, "onChange">,
) {
  const [value, setValue] = useState<string | undefined>(props.value);

  return (
    <AutocompleteSelect
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
      }}
    />
  );
}

export const Playground: Story = {
  render: () => (
    <StringDemo
      label="Macro target"
      value="track-1.filter.main.cutoff"
      options={targetOptions}
      className="w-[320px]"
      triggerClassName="w-full"
    />
  ),
};

export const Placeholder: Story = {
  render: () => (
    <StringDemo
      label="Macro target"
      value={undefined}
      options={targetOptions}
      placeholder="Choose a target"
      className="w-[320px]"
      triggerClassName="w-full"
    />
  ),
};

export const EmptyResults: Story = {
  render: () => (
    <StringDemo
      label="Macro target"
      value={undefined}
      options={[]}
      emptyText="No targets available"
      className="w-[320px]"
      triggerClassName="w-full"
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <StringDemo
      label="Macro target"
      value="track-1.filter.main.cutoff"
      options={targetOptions}
      disabled
      className="w-[320px]"
      triggerClassName="w-full"
    />
  ),
};
