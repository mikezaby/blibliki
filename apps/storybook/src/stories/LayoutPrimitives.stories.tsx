import { Button, Divider, Stack, Surface } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Primitives/Layout",
  component: Surface,
  tags: ["autodocs"],
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SurfaceTones: Story = {
  render: () => (
    <Stack direction="row" gap={3} wrap>
      <Surface
        tone="canvas"
        border="subtle"
        radius="md"
        style={{ padding: 16 }}
      >
        Canvas
      </Surface>
      <Surface tone="panel" border="subtle" radius="md" style={{ padding: 16 }}>
        Panel
      </Surface>
      <Surface
        tone="raised"
        border="subtle"
        radius="md"
        style={{ padding: 16 }}
      >
        Raised
      </Surface>
      <Surface
        tone="subtle"
        border="subtle"
        radius="md"
        style={{ padding: 16 }}
      >
        Subtle
      </Surface>
    </Stack>
  ),
};

export const SidebarExample: Story = {
  render: () => (
    <Surface
      tone="panel"
      border="subtle"
      shadow="xl"
      radius="none"
      style={{ width: 220, minHeight: 280 }}
    >
      <Stack direction="row" align="center" gap={2} style={{ padding: 12 }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background:
              "linear-gradient(135deg, var(--ui-color-primary-500), var(--ui-color-secondary-500))",
          }}
        />
        <strong>Audio Modules</strong>
      </Stack>
      <Divider />
      <Stack gap={1} style={{ padding: 12 }}>
        <Button
          color="neutral"
          variant="outlined"
          style={{ justifyContent: "flex-start" }}
        >
          Oscillator
        </Button>
        <Button
          color="neutral"
          variant="outlined"
          style={{ justifyContent: "flex-start" }}
        >
          Filter
        </Button>
        <Button
          color="neutral"
          variant="outlined"
          style={{ justifyContent: "flex-start" }}
        >
          Envelope
        </Button>
      </Stack>
    </Surface>
  ),
};

export const SubtleSurfaceUsage: Story = {
  render: () => (
    <Surface tone="canvas" border="subtle" radius="md" style={{ padding: 16 }}>
      <Stack gap={3}>
        <strong>Subtle Surfaces</strong>
        <Surface tone="subtle" border="subtle" radius="md" style={{ padding: 12 }}>
          Section background (low emphasis)
        </Surface>
        <Surface tone="panel" border="subtle" radius="md" style={{ padding: 12 }}>
          Panel background (higher emphasis)
        </Surface>
      </Stack>
    </Surface>
  ),
};
