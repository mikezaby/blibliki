import { Context } from "@blibliki/utils";
import { describe, expect, test, vi } from "vitest";
import { StepSequencer } from "../src/StepSequencer";
import { Transport } from "../src/Transport";
import {
  createTestConfig,
  createTestPattern,
  waitForScheduling,
} from "./helpers/stepSequencerHelpers";

describe("StepSequencer - Integration with Transport", () => {
  test("events scheduled with Transport's lookahead", async () => {
    const triggeredEvents: any[] = [];
    const pattern = createTestPattern({
      activeSteps: [0, 4, 8, 12],
      notes: [{ note: "C4", velocity: 100 }],
    });

    const sequencer = new StepSequencer(
      createTestConfig({
        patterns: [pattern],
        onStepTrigger: (step, timing) => {
          triggeredEvents.push({ step, timing });
        },
      }),
    );

    const context = new Context();
    await context.resume();

    const transport = new Transport(context, sequencer);
    transport.bpm = 120;

    sequencer.start(context.currentTime);
    transport.start();

    await waitForScheduling();

    transport.stop();
    sequencer.stop(context.currentTime);

    expect(triggeredEvents.length).toBeGreaterThan(0);
  });

  test("multiple sequencers with separate transports", async () => {
    const events1: any[] = [];
    const events2: any[] = [];

    const pattern1 = createTestPattern({
      name: "Drums",
      activeSteps: [0, 4, 8, 12],
    });
    const pattern2 = createTestPattern({
      name: "Bass",
      activeSteps: [0, 4, 8, 12],
    });

    const sequencer1 = new StepSequencer(
      createTestConfig({
        patterns: [pattern1],
        onStepTrigger: (step, timing) => events1.push({ step, timing }),
      }),
    );

    const sequencer2 = new StepSequencer(
      createTestConfig({
        patterns: [pattern2],
        onStepTrigger: (step, timing) => events2.push({ step, timing }),
      }),
    );

    const context = new Context();
    await context.resume();

    // Each sequencer has its own transport
    const transport1 = new Transport(context, sequencer1);
    transport1.bpm = 120;

    const transport2 = new Transport(context, sequencer2);
    transport2.bpm = 120;

    sequencer1.start(context.currentTime);
    transport1.start();

    sequencer2.start(context.currentTime);
    transport2.start();

    await waitForScheduling(400); // Wait longer to ensure both transports schedule

    transport1.stop();
    transport2.stop();

    expect(events1.length).toBeGreaterThan(0);
    expect(events2.length).toBeGreaterThan(0);
  });

  test("pattern sequence cycles correctly", async () => {
    const stateChanges: any[] = [];
    const patternA = createTestPattern({
      name: "A",
      steps: 4,
      activeSteps: [0, 1, 2, 3],
    });
    const patternB = createTestPattern({
      name: "B",
      steps: 4,
      activeSteps: [0, 1, 2, 3],
    });

    const sequencer = new StepSequencer(
      createTestConfig({
        patterns: [patternA, patternB],
        stepsPerPage: 4,
        patternSequence: "AB",
        enableSequence: true,
        onStateChange: (state) => stateChanges.push({ ...state }),
      }),
    );

    const context = new Context();
    await context.resume();

    const transport = new Transport(context, sequencer);
    transport.bpm = 480; // Very fast for quicker test

    sequencer.start(context.currentTime);
    transport.start();

    await waitForScheduling(1000); // Longer wait for pattern to complete and switch

    transport.stop();

    // Verify pattern switching occurred
    const patternIndices = stateChanges.map((s) => s.currentPattern);
    expect(patternIndices).toContain(0); // Pattern A
    expect(patternIndices).toContain(1); // Pattern B

    // Verify sequence position was formatted
    const sequencePositions = stateChanges
      .map((s) => s.sequencePosition)
      .filter(Boolean);
    expect(sequencePositions.length).toBeGreaterThan(0);
  });

  test("oneShot mode stops after pattern completion", async () => {
    const onComplete = vi.fn();
    const pattern = createTestPattern({
      steps: 4,
      activeSteps: [0, 1, 2, 3], // All steps active so pattern completes
    });

    const sequencer = new StepSequencer(
      createTestConfig({
        patterns: [pattern],
        stepsPerPage: 4,
        playbackMode: "oneShot",
        onComplete,
      }),
    );

    const context = new Context();
    await context.resume();

    const transport = new Transport(context, sequencer);
    transport.bpm = 480; // Fast tempo

    sequencer.start(context.currentTime);
    transport.start();

    await waitForScheduling(800); // Wait for pattern to complete

    expect(onComplete).toHaveBeenCalled();
    expect(sequencer.getState().isRunning).toBe(false);
  });
});
