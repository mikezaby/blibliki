import { Logo, Stack, Text } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Primitives/Logo",
  component: Logo,
  tags: ["autodocs"],
  args: {
    wordmark: false,
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Logo {...args} className={args.wordmark ? "text-3xl" : "h-16 w-16"} />
  ),
};

export const Mark: Story = {
  render: () => (
    <Stack direction="row" align="end" gap={4}>
      <Logo className="h-24 w-24" />
      <Logo className="h-12 w-12" />
      <Logo className="h-8 w-8" />
      <Logo className="h-4 w-4" />
    </Stack>
  ),
};

// The wordmark's face, weight, case and spacing are fixed by the component.
// Only the size changes from one use to the next.
export const Wordmark: Story = {
  render: () => (
    <Stack gap={4}>
      <Logo wordmark className="text-5xl" />
      <Logo wordmark className="text-2xl" />
      <Logo wordmark className="text-lg" />
      <Logo wordmark className="text-sm" />
    </Stack>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack gap={3}>
      <Text tone="primary" asChild>
        <span>
          <Logo wordmark className="text-2xl" />
        </span>
      </Text>
      <Text tone="muted" asChild>
        <span>
          <Logo wordmark className="text-2xl" />
        </span>
      </Text>
      <Text tone="info" asChild>
        <span>
          <Logo wordmark className="text-2xl" />
        </span>
      </Text>
    </Stack>
  ),
};
