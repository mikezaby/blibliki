// @vitest-environment jsdom
import { PlaybackMode, Resolution, type IPage } from "@blibliki/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StepSequencerEditor from "../../../src/components/AudioModule/StepSequencer/StepSequencerEditor";

function createPages(): IPage[] {
  return [
    {
      name: "Page 1",
      steps: Array.from({ length: 16 }, (_, index) => ({
        active: index === 1,
        notes: index === 1 ? [{ note: "D3", velocity: 90 }] : [],
        ccMessages: [],
        probability: 100,
        microtimeOffset: 0,
        duration: "1/16" as const,
      })),
    },
  ];
}

describe("StepSequencerEditor", () => {
  afterEach(cleanup);

  it("selects a step and renders it in the shared step editor", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Step 2" }));

    expect(screen.getByText("D3")).toBeDefined();
  });

  it("emits an immutable step update when toggling activation", () => {
    const pages = createPages();
    const onStepChange = vi.fn();

    render(
      <StepSequencerEditor
        pages={pages}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={onStepChange}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Activate step" })[0]!,
    );

    expect(onStepChange).toHaveBeenCalledWith(
      0,
      0,
      expect.objectContaining({ active: true }),
    );
    expect(pages[0]?.steps[0]?.active).toBe(false);
  });

  it("hides CC editing and transport controls when capabilities are absent", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
        showCcMessages={false}
      />,
    );

    expect(screen.queryByPlaceholderText("CC#")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });
});
