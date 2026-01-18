import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { createTestConfig } from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Lifecycle", () => {
  test("start sets isRunning to true", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    expect(sequencer.getState().isRunning).toBe(true);
  });

  test("start calls onStateChange callback", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isRunning: true }),
    );
  });

  test("start does nothing if already running", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    onStateChange.mockClear();
    sequencer.start(0);

    expect(onStateChange).not.toHaveBeenCalled();
  });

  test("stop sets isRunning to false", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    sequencer.stop(0);

    expect(sequencer.getState().isRunning).toBe(false);
  });

  test("stop calls onStateChange callback", () => {
    const onStateChange = vi.fn();
    const config = createTestConfig({ onStateChange });
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    onStateChange.mockClear();
    sequencer.stop(0);

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isRunning: false }),
    );
  });

  test("reset resets state to initial", () => {
    const config = createTestConfig();
    const sequencer = new StepSequencer(config);

    sequencer.start(0);
    sequencer.reset();

    const state = sequencer.getState();
    expect(state).toEqual({
      isRunning: false,
      currentPattern: 0,
      currentPage: 0,
      currentStep: 0,
      sequencePosition: undefined,
    });
  });
});
