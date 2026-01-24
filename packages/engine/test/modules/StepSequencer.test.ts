import { sleep } from "@blibliki/utils";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import StepSequencer, {
  IStepSequencerProps,
  Resolution,
  PlaybackMode,
} from "@/modules/StepSequencer";

describe("StepSequencer", () => {
  describe("MIDI event timing with steps 0 and 7 (1/2 note duration)", () => {
    let stepSequencer: StepSequencer;
    let midiEvents: Array<{
      event: MidiEvent;
      time: number;
    }>;
    let startTime: number;

    beforeEach((ctx) => {
      const bpm = 120;
      ctx.engine.bpm = bpm;

      // Create a pattern with steps at positions 0 and 7
      const props: IStepSequencerProps = {
        patterns: [
          {
            name: "A",
            pages: [
              {
                name: "Page 1",
                steps: Array.from({ length: 16 }, (_, i) => {
                  if (i === 0 || i === 7) {
                    return {
                      active: true,
                      notes: [{ note: "C4", velocity: 100 }],
                      ccMessages: [],
                      probability: 100,
                      microtimeOffset: 0,
                      duration: "1/2" as const,
                    };
                  }
                  return {
                    active: false,
                    notes: [],
                    ccMessages: [],
                    probability: 100,
                    microtimeOffset: 0,
                    duration: "1/16" as const,
                  };
                }),
              },
            ],
          },
        ],
        activePatternNo: 0,
        activePageNo: 0,
        stepsPerPage: 16,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        patternSequence: "",
        enableSequence: false,
      };

      stepSequencer = new StepSequencer(ctx.engine.id, {
        name: "stepSequencer",
        moduleType: ModuleType.StepSequencer,
        props,
      });

      // Capture MIDI events
      midiEvents = [];
      const originalOnMidiEvent = stepSequencer.midiOutput.onMidiEvent;
      stepSequencer.midiOutput.onMidiEvent = (event: MidiEvent) => {
        midiEvents.push({
          event,
          time: event.triggeredAt,
        });
        originalOnMidiEvent.call(stepSequencer.midiOutput, event);
      };

      // Start the transport and step sequencer
      startTime = ctx.context.currentTime;
      ctx.engine.transport.start(startTime);
      stepSequencer.start(startTime);
    });

    afterEach(async (ctx) => {
      // Stop transport
      const stopTime = ctx.context.currentTime;
      ctx.engine.transport.stop(stopTime);
      stepSequencer.stop(stopTime);
    });

    it("should emit MIDI events at precise times for steps 0 and 7", async () => {
      // Wait for the pattern to play through step 7 and beyond
      // At 120 BPM with 1/16 resolution:
      // - Each step = 0.125s
      // - 8 steps = 1 second
      // - 1/2 note duration = 1 second
      await sleep(1200);

      // Verify we captured events
      expect(midiEvents.length).toBeGreaterThan(0);

      // Filter events by type
      const noteOnEvents = midiEvents.filter(
        (e) => e.event.type === "noteon" && e.event.note?.name === "C",
      );

      // We should have at least 2 note-ons (step 0 and step 7)
      expect(noteOnEvents.length).toBeGreaterThanOrEqual(2);

      // Get the first two note-on events (step 0 and step 7)
      const step0NoteOn = noteOnEvents[0];
      const step7NoteOn = noteOnEvents[1];

      expect(step0NoteOn).toBeDefined();
      expect(step7NoteOn).toBeDefined();

      // Verify the timing difference between step 0 and step 7
      // The absolute times may vary due to test timing, but the difference should be precise
      const timeDiff = step7NoteOn!.time - step0NoteOn!.time;
      expect(timeDiff).toBeCloseTo(0.875, 1); // 7 steps * 0.125s/step = 0.875s
    });

    it("should emit first attack at exactly startTime (Finding 1)", async () => {
      await sleep(1200);

      const noteOnEvents = midiEvents.filter(
        (e) => e.event.type === "noteon" && e.event.note?.name === "C",
      );

      const step0NoteOn = noteOnEvents[0];
      expect(step0NoteOn).toBeDefined();

      // FINDING 1: First attack should be at exactly startTime (tolerance: 1ms)
      // Currently failing: first attack is ~200ms late
      const timingError = Math.abs(step0NoteOn!.time - startTime);
      expect(timingError).toBeLessThan(0.001); // Within 1ms of startTime
    });

    it("should emit second attack at exactly 0.875s after first (Finding 2)", async () => {
      await sleep(1200);

      const noteOnEvents = midiEvents.filter(
        (e) => e.event.type === "noteon" && e.event.note?.name === "C",
      );

      const step0NoteOn = noteOnEvents[0];
      const step7NoteOn = noteOnEvents[1];

      expect(step0NoteOn).toBeDefined();
      expect(step7NoteOn).toBeDefined();

      // FINDING 2: Second attack should be exactly 0.875s after first (tolerance: 1ms)
      // Currently failing: timing is off by ~11ms (0.864s instead of 0.875s)
      const expectedInterval = 0.875; // 7 steps * 0.125s/step
      const actualInterval = step7NoteOn!.time - step0NoteOn!.time;
      const timingError = Math.abs(actualInterval - expectedInterval);

      expect(timingError).toBeLessThan(0.001); // Within 1ms of expected interval
    });

    it("should emit note-off at correct time (1/2 note duration = 1 second)", async () => {
      await sleep(1200);

      // Get note-on and note-off events
      const noteOnEvents = midiEvents.filter(
        (e) => e.event.type === "noteon" && e.event.note?.name === "C",
      );
      const noteOffEvents = midiEvents.filter(
        (e) => e.event.type === "noteoff" && e.event.note?.name === "C",
      );

      expect(noteOffEvents.length).toBeGreaterThanOrEqual(2);

      const step0NoteOn = noteOnEvents[0];
      const step0NoteOff = noteOffEvents[0];
      expect(step0NoteOff).toBeDefined();

      // Step 0 note-off should be 1.0s after step 0 note-on (1/2 note duration)
      const step0Duration = step0NoteOff!.time - step0NoteOn!.time;
      expect(step0Duration).toBeCloseTo(1.0, 1); // 1/2 note = 1 second at 120 BPM
    });

    it("should not kill retriggered notes (step 0 note-off comes after step 7 note-on)", async () => {
      await sleep(1200);

      const noteOnEvents = midiEvents.filter(
        (e) => e.event.type === "noteon" && e.event.note?.name === "C",
      );
      const noteOffEvents = midiEvents.filter(
        (e) => e.event.type === "noteoff" && e.event.note?.name === "C",
      );

      const step0NoteOff = noteOffEvents[0];
      const step7NoteOn = noteOnEvents[1];

      // Verify that step 0 note-off occurs AFTER step 7 note-on
      // This is the scenario that was causing the bug
      expect(step0NoteOff!.time).toBeGreaterThan(step7NoteOn!.time);

      // The difference should be about 0.125s (1.0s duration - 0.875s step7 offset)
      const noteOffDelay = step0NoteOff!.time - step7NoteOn!.time;
      expect(noteOffDelay).toBeCloseTo(0.125, 1);
    });
  });

  describe("MIDI event timing with different notes", () => {
    let stepSequencer: StepSequencer;
    let midiEvents: Array<{
      event: MidiEvent;
      time: number;
    }>;
    let startTime: number;

    beforeEach((ctx) => {
      const bpm = 120;
      ctx.engine.bpm = bpm;

      // Create steps with different notes (C4, E4, G4) at steps 0, 4, 8
      const props: IStepSequencerProps = {
        patterns: [
          {
            name: "A",
            pages: [
              {
                name: "Page 1",
                steps: Array.from({ length: 16 }, (_, i) => {
                  if (i === 0) {
                    return {
                      active: true,
                      notes: [{ note: "C4", velocity: 100 }],
                      ccMessages: [],
                      probability: 100,
                      microtimeOffset: 0,
                      duration: "1/16" as const,
                    };
                  }
                  if (i === 4) {
                    return {
                      active: true,
                      notes: [{ note: "E4", velocity: 80 }],
                      ccMessages: [],
                      probability: 100,
                      microtimeOffset: 0,
                      duration: "1/16" as const,
                    };
                  }
                  if (i === 8) {
                    return {
                      active: true,
                      notes: [{ note: "G4", velocity: 120 }],
                      ccMessages: [],
                      probability: 100,
                      microtimeOffset: 0,
                      duration: "1/16" as const,
                    };
                  }
                  return {
                    active: false,
                    notes: [],
                    ccMessages: [],
                    probability: 100,
                    microtimeOffset: 0,
                    duration: "1/16" as const,
                  };
                }),
              },
            ],
          },
        ],
        activePatternNo: 0,
        activePageNo: 0,
        stepsPerPage: 16,
        resolution: Resolution.sixteenth,
        playbackMode: PlaybackMode.loop,
        patternSequence: "",
        enableSequence: false,
      };

      stepSequencer = new StepSequencer(ctx.engine.id, {
        name: "stepSequencer",
        moduleType: ModuleType.StepSequencer,
        props,
      });

      // Capture MIDI events
      midiEvents = [];
      const originalOnMidiEvent = stepSequencer.midiOutput.onMidiEvent;
      stepSequencer.midiOutput.onMidiEvent = (event: MidiEvent) => {
        midiEvents.push({
          event,
          time: event.triggeredAt,
        });
        originalOnMidiEvent.call(stepSequencer.midiOutput, event);
      };

      // Start the transport and step sequencer
      startTime = ctx.context.currentTime;
      ctx.engine.transport.start(startTime);
      stepSequencer.start(startTime);
    });

    afterEach(async (ctx) => {
      // Stop transport
      const stopTime = ctx.context.currentTime;
      ctx.engine.transport.stop(stopTime);
      stepSequencer.stop(stopTime);
    });

    it("should emit correct note values (C4, E4, G4)", async () => {
      await sleep(1200);

      // Get note-on events
      const noteOnEvents = midiEvents.filter((e) => e.event.type === "noteon");

      // Should have at least C4, E4, and G4
      expect(noteOnEvents.length).toBeGreaterThanOrEqual(3);

      // Find first occurrence of each note
      const c4Event = noteOnEvents.find((e) => e.event.note?.fullName === "C4");
      const e4Event = noteOnEvents.find((e) => e.event.note?.fullName === "E4");
      const g4Event = noteOnEvents.find((e) => e.event.note?.fullName === "G4");

      expect(c4Event).toBeDefined();
      expect(e4Event).toBeDefined();
      expect(g4Event).toBeDefined();

      // Verify note properties
      expect(c4Event!.event.note?.name).toBe("C");
      expect(c4Event!.event.note?.octave).toBe(4);

      expect(e4Event!.event.note?.name).toBe("E");
      expect(e4Event!.event.note?.octave).toBe(4);

      expect(g4Event!.event.note?.name).toBe("G");
      expect(g4Event!.event.note?.octave).toBe(4);
    });

    it("should emit notes at correct relative timing", async () => {
      await sleep(1200);

      const noteOnEvents = midiEvents.filter((e) => e.event.type === "noteon");

      const c4Event = noteOnEvents.find((e) => e.event.note?.fullName === "C4");
      const e4Event = noteOnEvents.find((e) => e.event.note?.fullName === "E4");
      const g4Event = noteOnEvents.find((e) => e.event.note?.fullName === "G4");

      // Verify timing - use relative timing
      // C4 at step 0
      // E4 at step 4: C4 + 0.5s (4 steps * 0.125s/step)
      // G4 at step 8: C4 + 1.0s (8 steps * 0.125s/step)
      expect(e4Event!.time - c4Event!.time).toBeCloseTo(0.5, 1);
      expect(g4Event!.time - c4Event!.time).toBeCloseTo(1.0, 1);
    });
  });
});
