import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>Device Status</CardTitle>
        <CardDescription>Monitor your connected synth node.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="sb-row" style={{ justifyContent: "space-between" }}>
          <span>Latency</span>
          <strong>3.8 ms</strong>
        </div>
        <div className="sb-row" style={{ justifyContent: "space-between" }}>
          <span>Sample rate</span>
          <strong>48 kHz</strong>
        </div>
      </CardContent>
      <CardFooter className="sb-row" style={{ justifyContent: "flex-end" }}>
        <Button variant="outlined" size="sm" color="neutral">
          Disconnect
        </Button>
        <Button size="sm" color="info">
          Open
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>Patch Bank</CardTitle>
        <CardDescription>12 presets available</CardDescription>
        <CardAction>
          <Button size="sm" variant="text" color="secondary">
            Manage
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p style={{ color: "var(--ui-color-text-secondary)" }}>
          Use card action for compact, contextual controls in the header.
        </p>
      </CardContent>
    </Card>
  ),
};
