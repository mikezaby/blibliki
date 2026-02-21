import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Primitives/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [showGrid, setShowGrid] = useState(true);
  const [quality, setQuality] = useState("high");

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          style={{
            width: 360,
            height: 180,
            borderRadius: "var(--ui-radius-lg)",
            border: "1px dashed var(--ui-color-border-subtle)",
            background:
              "color-mix(in oklab, var(--ui-color-surface-raised), var(--ui-color-primary-500) 4%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ui-color-text-secondary)",
            userSelect: "none",
          }}
        >
          Right click here
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Canvas</ContextMenuLabel>
        <ContextMenuItem>
          Duplicate
          <ContextMenuShortcut>Cmd+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset>
          Rename
          <ContextMenuShortcut>R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem
          checked={showGrid}
          onCheckedChange={(checked) => {
            setShowGrid(checked === true);
          }}
        >
          Show Grid
        </ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Quality</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup value={quality} onValueChange={setQuality}>
              <ContextMenuRadioItem value="draft">Draft</ContextMenuRadioItem>
              <ContextMenuRadioItem value="high">High</ContextMenuRadioItem>
              <ContextMenuRadioItem value="ultra">Ultra</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete Module</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const Playground: Story = {
  render: () => <Demo />,
};
