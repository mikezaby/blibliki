// @vitest-environment jsdom
import { PlaybackMode, Resolution } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Controls from "../../../src/components/AudioModule/StepSequencer/Controls";
import { UIProvider } from "../../../src/ui-system/UIProvider";

describe("StepSequencer controls layout", () => {
  it("does not use legacy tailwind utility classes on control actions", () => {
    const { container } = render(
      <UIProvider>
        <Controls
          stepsPerPage={16}
          resolution={Resolution.sixteenth}
          playbackMode={PlaybackMode.loop}
          isRunning={false}
          onStepsChange={vi.fn()}
          onResolutionChange={vi.fn()}
          onPlaybackModeChange={vi.fn()}
          onStart={vi.fn()}
          onStop={vi.fn()}
        />
      </UIProvider>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.className).not.toContain("bg-slate-50");

    const startButton = screen.getByRole("button", { name: "Start" });
    expect(startButton.className).not.toContain("cursor-not-allowed");
    expect(startButton.className).not.toContain("dark:");
  });
});
