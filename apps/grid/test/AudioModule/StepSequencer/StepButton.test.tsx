// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(cleanup);

  it("uses blibliki/ui Button primitives for both controls", () => {
    render(
      <StepButton
        step={createStep()}
        stepIndex={0}
        isPlaying={false}
        isSelected={false}
        isInSelection={false}
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

  it("uses semantic surface/text classes for inactive step styling", () => {
    render(
      <StepButton
        step={createStep()}
        stepIndex={3}
        isPlaying={false}
        isSelected={false}
        isInSelection={false}
        onSelect={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    const stepCellButton = screen.getByRole("button", { name: "Step 4" });

    expect(stepCellButton.className).toContain("bg-surface-panel");
    expect(stepCellButton.className).toContain("text-content-muted");
  });

  it("uses a subtle info tint for steps inside a selected range", () => {
    render(
      <StepButton
        step={createStep()}
        stepIndex={3}
        isPlaying={false}
        isSelected={false}
        isInSelection
        onSelect={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Step 4" }).className).toContain(
      "bg-info/10",
    );
  });
});
