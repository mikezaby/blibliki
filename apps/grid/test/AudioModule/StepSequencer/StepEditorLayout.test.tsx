// @vitest-environment jsdom
import { IStep } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StepEditor from "../../../src/components/AudioModule/StepSequencer/StepEditor";
import { UIProvider } from "../../../src/ui-system/UIProvider";

const STEP: IStep = {
  active: true,
  notes: [{ note: "C4", velocity: 100 }],
  ccMessages: [{ cc: 1, value: 64 }],
  probability: 100,
  microtimeOffset: 0,
  duration: "1/16",
};

describe("StepSequencer step editor layout", () => {
  it("does not use legacy tailwind utility classes on quick action buttons", () => {
    render(
      <UIProvider>
        <StepEditor step={STEP} stepIndex={0} onUpdate={vi.fn()} />
      </UIProvider>,
    );

    const clearButton = screen.getByRole("button", { name: "Clear" });
    expect(clearButton.className).not.toContain("bg-red-100");
    expect(clearButton.className).not.toContain("dark:");
  });
});
