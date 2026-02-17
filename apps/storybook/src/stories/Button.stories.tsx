import { Button } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const buttonColors = [
  "primary",
  "secondary",
  "error",
  "warning",
  "info",
  "success",
] as const;

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Save patch",
    color: "primary",
    variant: "contained",
    size: "md",
    asChild: false,
  },
  argTypes: {
    color: {
      control: "select",
      options: buttonColors,
    },
    variant: {
      control: "select",
      options: ["contained", "outlined", "text"],
    },
    size: {
      control: "select",
      options: ["md", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="sb-row">
      <Button variant="contained">Contained</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="text">Text</Button>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="sb-row">
      {buttonColors.map((color) => (
        <Button key={color} color={color}>
          {color}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="sb-row">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Icon button">
        <span aria-hidden>+</span>
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
};

export const AsChildLink: Story = {
  render: () => (
    <Button asChild variant="text" color="info">
      <a href="https://blibliki.com" target="_blank" rel="noreferrer">
        Open Blibliki
      </a>
    </Button>
  ),
};
