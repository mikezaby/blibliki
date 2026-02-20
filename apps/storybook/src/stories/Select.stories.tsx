import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const options = [
  { value: "sine", label: "Sine" },
  { value: "triangle", label: "Triangle" },
  { value: "square", label: "Square" },
  { value: "saw", label: "Saw" },
];

const meta = {
  title: "Primitives/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function SelectDemo({
  disabled = false,
  size = "md",
}: {
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [value, setValue] = useState("sine");

  return (
    <div className="sb-row" style={{ minWidth: 260 }}>
      <Select value={value} onValueChange={setValue} disabled={disabled}>
        <SelectTrigger size={size} className="w-full">
          <SelectValue placeholder="Select waveform" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Waveforms</SelectLabel>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="noise">Noise</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export const Playground: Story = {
  render: () => <SelectDemo />,
};

export const Sizes: Story = {
  render: () => (
    <div className="sb-row" style={{ flexDirection: "column", alignItems: "stretch", minWidth: 260 }}>
      <SelectDemo size="sm" />
      <SelectDemo size="md" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => <SelectDemo disabled />,
};
