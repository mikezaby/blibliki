// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent } from "../../src/components/ui";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("Dialog wrapper", () => {
  it("does not hardcode legacy tailwind utility classes in DialogContent", () => {
    render(
      <UIProvider>
        <Dialog open onOpenChange={() => {}}>
          <DialogContent>
            <div>Dialog Body</div>
          </DialogContent>
        </Dialog>
      </UIProvider>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).not.toContain("bg-background");
    expect(dialog.className).not.toContain("max-w-[calc(100%-2rem)]");
  });
});
