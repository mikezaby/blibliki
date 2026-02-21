import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@blibliki/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outlined" color="neutral" size="sm">
          Open dialog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Module Settings</DialogTitle>
          <DialogDescription>
            Configure key module options before saving your patch.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="text" color="neutral" size="sm">
            Cancel
          </Button>
          <Button variant="contained" color="primary" size="sm">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button
          variant="outlined"
          color="neutral"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Open controlled dialog
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Controlled Dialog</DialogTitle>
              <DialogDescription>
                This dialog is controlled by external React state.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="contained"
                color="primary"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};
