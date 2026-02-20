// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StepButton from "../../../src/components/AudioModule/StepSequencer/StepButton";

const createStep = () => ({
  active: false,
  notes: [] as Array<{ note: string; velocity: number }>,
  ccMessages: [] as Array<{ cc: number; value: number }>,
  probability: 100,
  microtimeOffset: 0,
  duration: "1/16" as const,
});

describe("StepButton", () => {
  it("uses blibliki/ui Button primitives for both controls", () => {
    render(
      <StepButton
        step={createStep()}
        stepIndex={0}
        isPlaying={false}
        isSelected={false}
        onSelect={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => {
      expect(button.className).toContain("ui-button");
    });
  });

  it("uses surface-1 token for inactive step background", () => {
    render(
      <StepButton
        step={createStep()}
        stepIndex={3}
        isPlaying={false}
        isSelected={false}
        onSelect={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    const stepCellButton = screen.getByRole("button", { name: "Step 4" });

    expect(stepCellButton.getAttribute("style") ?? "").toContain(
      "var(--ui-color-surface-1)",
    );
  });
});
