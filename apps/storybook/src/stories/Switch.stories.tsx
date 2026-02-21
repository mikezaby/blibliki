import { Switch } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const switchColors = [
  "primary",
  "secondary",
  "error",
  "warning",
  "info",
  "success",
] as const;

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: {
    checked: false,
    color: "primary",
    size: "md",
    disabled: false,
    "aria-label": "Toggle option",
  },
  argTypes: {
    color: {
      control: "select",
      options: switchColors,
    },
    size: {
      control: "select",
      options: ["sm", "md"],
    },
    onCheckedChange: {
      control: false,
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(Boolean(args.checked));

    useEffect(() => {
      setChecked(Boolean(args.checked));
    }, [args.checked]);

    return (
      <Switch
        {...args}
        checked={checked}
        onCheckedChange={(nextChecked) => {
          setChecked(nextChecked);
        }}
      />
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="sb-row">
      <Switch aria-label="Small switch" size="sm" checked />
      <Switch aria-label="Medium switch" size="md" checked />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="sb-row">
      {switchColors.map((color) => (
        <Switch key={color} aria-label={`${color} switch`} color={color} checked />
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="sb-row">
      <Switch aria-label="Unchecked switch" />
      <Switch aria-label="Checked switch" checked />
      <Switch aria-label="Disabled unchecked switch" disabled />
      <Switch aria-label="Disabled checked switch" checked disabled />
    </div>
  ),
};
