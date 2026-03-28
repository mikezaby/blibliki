import { describe, expect, it } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import StepSequencer, {
  IStep,
  IStepSequencerProps,
  PlaybackMode,
  Resolution,
} from "@/modules/StepSequencer";
import { waitForCondition } from "../utils/waitForCondition";

type CapturedMidiEvent = {
  event: MidiEvent;
  time: number;
};

const createInactiveStep = (): IStep => ({
  active: false,
  notes: [],
  ccMessages: [],
  probability: 100,
  microtimeOffset: 0,
  duration: "1/16",
});

const createNoteStep = (
  note: string,
  duration: IStep["duration"] = "1/16",
): IStep => ({
  active: true,
  notes: [{ note, velocity: 100 }],
  ccMessages: [],
  probability: 100,
  microtimeOffset: 0,
  duration,
});

const createRunningSequencer = (
  ctx: {
    engine: {
      id: string;
      bpm: number;
      transport: {
        start: (time: number) => void;
        stop: (time: number) => void;
      };
    };
    context: { currentTime: number };
  },
  props: IStepSequencerProps,
) => {
  ctx.engine.bpm = 120;

  const stepSequencer = new StepSequencer(ctx.engine.id, {
    name: "stepSequencer",
    moduleType: ModuleType.StepSequencer,
    props,
  });

  const midiEvents: CapturedMidiEvent[] = [];
  const originalOnMidiEvent = stepSequencer.midiOutput.onMidiEvent;
  stepSequencer.midiOutput.onMidiEvent = (event: MidiEvent) => {
    midiEvents.push({
      event,
      time: event.triggeredAt,
    });
    originalOnMidiEvent.call(stepSequencer.midiOutput, event);
  };

  const startTime = ctx.context.currentTime;
  ctx.engine.transport.start(startTime);
  stepSequencer.start(startTime);

  return {
    midiEvents,
    startTime,
    stop: () => {
      const stopTime = ctx.context.currentTime;
      ctx.engine.transport.stop(stopTime);
      stepSequencer.stop(stopTime);
    },
  };
};

const baseProps = (steps: IStep[]): IStepSequencerProps => ({
  patterns: [
    {
      name: "A",
      pages: [
        {
          name: "Page 1",
          steps,
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
});

describe("StepSequencer", () => {
  it("plays only the active loop pages while keeping extra pages in props", async (ctx) => {
    const props: IStepSequencerProps = {
      ...baseProps([
        createNoteStep("C4"),
        ...Array.from({ length: 15 }, createInactiveStep),
      ]),
      patterns: [
        {
          name: "A",
          pages: [
            {
              name: "Page 1",
              steps: [
                createNoteStep("C4"),
                ...Array.from({ length: 15 }, createInactiveStep),
              ],
            },
            {
              name: "Page 2",
              steps: [
                createNoteStep("E4"),
                ...Array.from({ length: 15 }, createInactiveStep),
              ],
            },
          ],
        },
      ],
    };

    const run = createRunningSequencer(ctx, props);

    try {
      await waitForCondition(
        () =>
          run.midiEvents.filter(
            (entry) =>
              entry.event.type === "noteon" &&
              entry.event.note?.fullName === "C4",
          ).length >= 2 ||
          run.midiEvents.some(
            (entry) =>
              entry.event.type === "noteon" &&
              entry.event.note?.fullName === "E4",
          ),
        {
          timeoutMs: 2500,
          description: "step sequencer to complete one loop cycle",
        },
      );

      const noteOnEvents = run.midiEvents.filter(
        (entry) => entry.event.type === "noteon",
      );

      expect(
        noteOnEvents.filter((entry) => entry.event.note?.fullName === "C4"),
      ).toHaveLength(2);
      expect(
        noteOnEvents.some((entry) => entry.event.note?.fullName === "E4"),
      ).toBe(false);
      expect(props.patterns[0]?.pages).toHaveLength(2);
      expect(props.loopLength).toBe(1);
    } finally {
      run.stop();
    }
  });

  it("emits note events in order with stable relative timing", async (ctx) => {
    const run = createRunningSequencer(
      ctx,
      baseProps([
        createNoteStep("C4"),
        ...Array.from({ length: 3 }, createInactiveStep),
        createNoteStep("E4"),
        ...Array.from({ length: 3 }, createInactiveStep),
        createNoteStep("G4"),
        ...Array.from({ length: 7 }, createInactiveStep),
      ]),
    );

    try {
      await waitForCondition(
        () =>
          ["C4", "E4", "G4"].every((note) =>
            run.midiEvents.some(
              (entry) =>
                entry.event.type === "noteon" &&
                entry.event.note?.fullName === note,
            ),
          ),
        {
          timeoutMs: 1500,
          description: "step sequencer note-on events",
        },
      );

      const noteOnEvents = run.midiEvents.filter(
        (entry) => entry.event.type === "noteon",
      );
      const firstNotes = noteOnEvents
        .slice(0, 3)
        .map((entry) => entry.event.note?.fullName);

      const c4Event = noteOnEvents.find(
        (entry) => entry.event.note?.fullName === "C4",
      );
      const e4Event = noteOnEvents.find(
        (entry) => entry.event.note?.fullName === "E4",
      );
      const g4Event = noteOnEvents.find(
        (entry) => entry.event.note?.fullName === "G4",
      );

      expect(firstNotes).toEqual(["C4", "E4", "G4"]);
      expect(e4Event!.time - c4Event!.time).toBeCloseTo(0.5, 1);
      expect(g4Event!.time - c4Event!.time).toBeCloseTo(1.0, 1);
    } finally {
      run.stop();
    }
  });

  it("does not cut a retriggered note off with the previous release", async (ctx) => {
    const run = createRunningSequencer(
      ctx,
      baseProps(
        Array.from({ length: 16 }, (_, index) => {
          if (index === 0 || index === 7) {
            return createNoteStep("C4", "1/2");
          }

          return createInactiveStep();
        }),
      ),
    );

    try {
      await waitForCondition(
        () => {
          const noteOnEvents = run.midiEvents.filter(
            (entry) =>
              entry.event.type === "noteon" &&
              entry.event.note?.fullName === "C4",
          );
          const noteOffEvents = run.midiEvents.filter(
            (entry) =>
              entry.event.type === "noteoff" &&
              entry.event.note?.fullName === "C4",
          );

          return noteOnEvents.length >= 2 && noteOffEvents.length >= 1;
        },
        {
          timeoutMs: 1500,
          description: "step sequencer retrigger note events",
        },
      );

      const noteOnEvents = run.midiEvents.filter(
        (entry) =>
          entry.event.type === "noteon" && entry.event.note?.fullName === "C4",
      );
      const noteOffEvents = run.midiEvents.filter(
        (entry) =>
          entry.event.type === "noteoff" && entry.event.note?.fullName === "C4",
      );

      const firstNoteOn = noteOnEvents[0]!;
      const secondNoteOn = noteOnEvents[1]!;
      const firstNoteOff = noteOffEvents[0]!;

      expect(secondNoteOn.time - firstNoteOn.time).toBeCloseTo(0.875, 1);
      expect(firstNoteOff.time - firstNoteOn.time).toBeCloseTo(1.0, 1);
      expect(firstNoteOff.time).toBeGreaterThan(secondNoteOn.time);
    } finally {
      run.stop();
    }
  });
});
