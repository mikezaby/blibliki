// @vitest-environment jsdom
import {
  ModuleType,
  PlaybackMode,
  Resolution,
  type IStepSequencerProps,
} from "@blibliki/engine";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StepSequencer from "../../../src/components/AudioModule/StepSequencer";

vi.mock("../../../src/hooks", () => ({
  useModuleState: () => ({
    currentStep: 3,
    isRunning: false,
    sequencePosition: undefined,
  }),
}));

vi.mock(
  "../../../src/components/AudioModule/StepSequencer/StepSequencerEditor",
  () => ({
    default: () => <div data-testid="shared-step-sequencer-editor" />,
  }),
);

function createProps(): IStepSequencerProps {
  return {
    patterns: [
      {
        name: "A",
        pages: [
          {
            name: "Page 1",
            steps: Array.from({ length: 16 }, () => ({
              active: false,
              notes: [],
              ccMessages: [],
              probability: 100,
              microtimeOffset: 0,
              duration: "1/16" as const,
            })),
          },
        ],
      },
    ],
    activePatternNo: 0,
    activePageNo: 0,
    loopLength: 1,
    stepsPerPage: 16,
    resolution: Resolution.sixteenth,
    playbackMode: PlaybackMode.loop,
    patternSequence: "",
    enableSequence: false,
  };
}

describe("StepSequencer module component", () => {
  afterEach(cleanup);

  it("keeps pattern controls and delegates page and step editing", () => {
    render(
      <StepSequencer
        id="sequencer-1"
        name="Sequencer"
        moduleType={ModuleType.StepSequencer}
        props={createProps()}
        updateProp={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "A" })).toBeDefined();
    expect(screen.getByTestId("shared-step-sequencer-editor")).toBeDefined();
  });
});
