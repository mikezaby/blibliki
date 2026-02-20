import { Input, Label, Stack } from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Primitives/Label",
  component: Label,
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <div style={{ minWidth: 280 }}>
      <Stack gap={2}>
        <Label htmlFor="storybook-label-input">Project name</Label>
        <Input id="storybook-label-input" placeholder="Untitled patch" />
      </Stack>
    </div>
  ),
};

export const Styled: Story = {
  render: () => (
    <div style={{ minWidth: 280 }}>
      <Stack gap={2}>
        <Label className="text-xs font-semibold uppercase tracking-wide">
          Frequency
        </Label>
        <Input type="number" defaultValue={440} />
      </Stack>
    </div>
  ),
};

export const DisabledState: Story = {
  render: () => (
    <div style={{ minWidth: 280 }}>
      <Stack gap={2}>
        <Label data-disabled="true">Disabled field</Label>
        <Input disabled defaultValue="Not editable" />
      </Stack>
    </div>
  ),
};
