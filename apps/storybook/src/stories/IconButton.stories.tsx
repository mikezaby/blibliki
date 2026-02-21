import { IconButton } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const iconButtonColors = [
  "primary",
  "neutral",
  "secondary",
  "error",
  "warning",
  "info",
  "success",
] as const;

const iconButtonVariants = ["contained", "outlined", "text"] as const;
const iconButtonSizes = ["xs", "sm", "md"] as const;

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: {
    "aria-label": "Add item",
    icon: <PlusIcon />,
    color: "secondary",
    variant: "text",
    size: "md",
  },
  argTypes: {
    color: {
      control: "select",
      options: iconButtonColors,
    },
    variant: {
      control: "select",
      options: iconButtonVariants,
    },
    size: {
      control: "select",
      options: iconButtonSizes,
    },
    icon: {
      control: false,
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Colors: Story = {
  render: () => (
    <div className="sb-row">
      {iconButtonColors.map((color) => (
        <IconButton
          key={color}
          aria-label={`${color} icon button`}
          icon={<PlusIcon />}
          color={color}
          variant="contained"
        />
      ))}
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="sb-row">
      {iconButtonVariants.map((variant) => (
        <IconButton
          key={variant}
          aria-label={`${variant} icon button`}
          icon={<PlusIcon />}
          variant={variant}
        />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="sb-row">
      {iconButtonSizes.map((size) => (
        <IconButton
          key={size}
          aria-label={`${size} icon button`}
          icon={<PlusIcon />}
          size={size}
          variant="contained"
          color="neutral"
        />
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
