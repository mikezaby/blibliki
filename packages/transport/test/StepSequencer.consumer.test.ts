import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import type { StepEvent } from "../src/StepSequencer.types";
import {
  createTestConfig,
  createTestPattern,
} from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Consumer", () => {
  test("consumer triggers onStepTrigger callback", () => {
    const onStepTrigger = vi.fn();
    const config = createTestConfig({ onStepTrigger });
    const sequencer = new StepSequencer(config);

    const event: StepEvent = {
      ticks: 0,
      time: 0,
      contextTime: 0.5,
      step: {
        notes: [{ note: "C4", velocity: 100 }],
        ccMessages: [],
        duration: "1/16",
      },
      stepIndex: 0,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.start(0);
    sequencer.consumer(event);

    expect(onStepTrigger).toHaveBeenCalledWith(event.step, {
      contextTime: 0.5,
      ticks: 0,
    });
  });

  test("consumer updates current position state", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    const event: StepEvent = {
      ticks: 3840,
      time: 0.5,
      contextTime: 0.5,
      step: {
        notes: [],
        ccMessages: [],
        duration: "1/16",
      },
      stepIndex: 5,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.start(0);
    sequencer.consumer(event);

    const state = sequencer.getState();
    expect(state.currentStep).toBe(5);
    expect(state.currentPattern).toBe(0);
    expect(state.currentPage).toBe(0);
  });

  test("consumer calls onStateChange when state changes", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    const event: StepEvent = {
      ticks: 0,
      time: 0,
      contextTime: 0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 1,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.start(0);
    onStateChange.mockClear();
    sequencer.consumer(event);

    expect(onStateChange).toHaveBeenCalled();
  });

  test("consumer stops sequencer in oneShot mode after completion", () => {
    const onComplete = vi.fn();
    const config = createTestConfig({
      playbackMode: "oneShot",
      onComplete,
    });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    // Simulate pattern completion
    const lastEvent: StepEvent = {
      ticks: 15 * 3840,
      time: 0,
      contextTime: 0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 15,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.consumer(lastEvent);

    // Next event wraps to step 0
    const wrapEvent: StepEvent = {
      ticks: 16 * 3840,
      time: 0,
      contextTime: 1.0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 0,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.consumer(wrapEvent);

    expect(sequencer.getState().isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  test("consumer updates sequencePosition in sequence mode", () => {
    const config = createTestConfig({
      enableSequence: true,
      patternSequence: "2A",
      patterns: [createTestPattern({ name: "A" })],
    });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    const event: StepEvent = {
      ticks: 0,
      time: 0,
      contextTime: 0,
      step: { notes: [], ccMessages: [], duration: "1/16" },
      stepIndex: 0,
      patternIndex: 0,
      pageIndex: 0,
    };

    sequencer.consumer(event);

    const state = sequencer.getState();
    expect(state.sequencePosition).toBe("A (1/2)");
  });
});
