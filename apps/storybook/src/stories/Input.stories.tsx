import { Input } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";

const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "Type value...",
    size: "md",
    disabled: false,
    type: "text",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md"],
    },
    type: {
      control: "select",
      options: ["text", "number", "search", "password"],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

function InputDemo(props: ComponentProps<typeof Input>) {
  const [value, setValue] = useState("");

  return (
    <div style={{ minWidth: 260 }}>
      <Input
        {...props}
        value={value}
        onChange={(event) => {
          setValue(event.currentTarget.value);
        }}
      />
    </div>
  );
}

export const Playground: Story = {
  render: (args) => <InputDemo {...args} />,
};

export const Sizes: Story = {
  render: () => (
    <div
      className="sb-row"
      style={{ minWidth: 260, flexDirection: "column", alignItems: "stretch" }}
    >
      <Input size="sm" placeholder="Small input" />
      <Input size="md" placeholder="Medium input" />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div style={{ minWidth: 260 }}>
      <Input aria-invalid placeholder="Invalid value" defaultValue="broken-value" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ minWidth: 260 }}>
      <Input disabled placeholder="Disabled input" defaultValue="Can't edit" />
    </div>
  ),
};
