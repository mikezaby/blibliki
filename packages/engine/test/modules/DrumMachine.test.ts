import type { TestContext } from "vitest";
import { describe, expect, it } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import Inspector from "@/modules/Inspector";
import {
  readInspectorPeak,
  waitForInspectorPeakAbove,
  waitForInspectorValue,
} from "../utils/audioWaits";
import {
  waitForAudioTime,
  waitForMicrotasks,
} from "../utils/waitForCondition";

const DRUM_MACHINE_MODULE_TYPE = "DrumMachine" as ModuleType;

const DEFAULT_FLAT_PROP_KEYS = [
  "masterLevel",
  "kickLevel",
  "kickDecay",
  "kickTone",
  "snareLevel",
  "snareDecay",
  "snareTone",
  "tomLevel",
  "tomDecay",
  "tomTone",
  "cymbalLevel",
  "cymbalDecay",
  "cymbalTone",
  "cowbellLevel",
  "cowbellDecay",
  "cowbellTone",
  "clapLevel",
  "clapDecay",
  "clapTone",
  "openHatLevel",
  "openHatDecay",
  "openHatTone",
  "closedHatLevel",
  "closedHatDecay",
  "closedHatTone",
];

const VOICE_OUTPUTS = [
  "kick out",
  "snare out",
  "tom out",
  "cymbal out",
  "cowbell out",
  "clap out",
  "open hat out",
  "closed hat out",
];

const FIXED_NOTE_MAP = [
  { note: "C1", output: "kick out" }, // MIDI 36
  { note: "D1", output: "snare out" }, // MIDI 38
  { note: "D#1", output: "clap out" }, // MIDI 39
  { note: "F#1", output: "closed hat out" }, // MIDI 42
  { note: "A1", output: "tom out" }, // MIDI 45
  { note: "A#1", output: "open hat out" }, // MIDI 46
  { note: "C#2", output: "cymbal out" }, // MIDI 49
  { note: "G#2", output: "cowbell out" }, // MIDI 56
];

function createDrumMachine(ctx: TestContext) {
  const serialized = ctx.engine.addModule({
    name: "drum machine",
    moduleType: DRUM_MACHINE_MODULE_TYPE,
    props: {} as never,
  });

  return ctx.engine.findModule(serialized.id) as {
    moduleType: ModuleType;
    props: Record<string, unknown>;
    inputs: { findByName: (name: string) => { ioType?: string } };
    outputs: {
      findByName: (name: string) => { getAudioNode: () => AudioNode };
      collection: { name: string }[];
    };
    onMidiEvent: (event: MidiEvent) => void;
  };
}

function createInspector(ctx: TestContext) {
  const serialized = ctx.engine.addModule({
    name: "inspector",
    moduleType: ModuleType.Inspector,
    props: {},
  });

  return ctx.engine.findModule(serialized.id) as Inspector;
}

function connectOutputToInspector(
  drumMachine: ReturnType<typeof createDrumMachine>,
  outputName: string,
  inspector: Inspector,
) {
  const output = drumMachine.outputs.findByName(outputName);
  output.getAudioNode().connect(inspector.audioNode);
}

function readBufferDifference(a: Float32Array, b: Float32Array) {
  return a.reduce((total, value, index) => total + Math.abs(value - (b[index] ?? 0)), 0);
}

describe("DrumMachine", () => {
  it("constructs as a DrumMachine module with a flat prop surface", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);

    await waitForMicrotasks();

    expect(drumMachine.moduleType).toBe(DRUM_MACHINE_MODULE_TYPE);

    for (const key of DEFAULT_FLAT_PROP_KEYS) {
      expect(drumMachine.props).toHaveProperty(key);
    }
  });

  it("registers a midi input and a summed output", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);

    await waitForMicrotasks();

    expect(drumMachine.inputs.findByName("midi in").ioType).toBeDefined();
    expect(drumMachine.outputs.findByName("out").getAudioNode()).toBeDefined();
  });

  it("registers dedicated voice outputs for the classic kit voices", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);

    await waitForMicrotasks();

    const outputNames = drumMachine.outputs.collection.map(
      (output) => output.name,
    );
    expect(outputNames).toEqual(expect.arrayContaining(VOICE_OUTPUTS));
  });

  for (const { note, output } of FIXED_NOTE_MAP) {
    it(`routes ${note} to the summed output and the ${output} voice output`, async (ctx) => {
      const drumMachine = createDrumMachine(ctx);
      const summedInspector = createInspector(ctx);
      const voiceInspector = createInspector(ctx);

      await waitForMicrotasks();

      connectOutputToInspector(drumMachine, "out", summedInspector);
      connectOutputToInspector(drumMachine, output, voiceInspector);

      drumMachine.onMidiEvent(
        MidiEvent.fromNote(note, true, ctx.context.currentTime),
      );

      await waitForInspectorPeakAbove(summedInspector, 0.0001, {
        description: `summed output for ${note}`,
      });
      await waitForInspectorPeakAbove(voiceInspector, 0.0001, {
        description: `dedicated output for ${note}`,
      });
    });
  }

  it("keeps unmapped notes silent on the summed output", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);
    const summedInspector = createInspector(ctx);

    await waitForMicrotasks();

    connectOutputToInspector(drumMachine, "out", summedInspector);

    drumMachine.onMidiEvent(
      MidiEvent.fromNote("A0", true, ctx.context.currentTime),
    );

    await waitForInspectorValue(
      summedInspector,
      (value) => Math.abs(value) < 0.0001,
      { description: "silent summed output for unmapped note" },
    );
  });

  it("scales kick output with incoming velocity", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);
    const inspector = createInspector(ctx);

    await waitForMicrotasks();

    connectOutputToInspector(drumMachine, "kick out", inspector);

    const lowVelocityAt = ctx.context.currentTime + 0.01;
    drumMachine.onMidiEvent(
      MidiEvent.fromNote(
        { name: "C", octave: 1, velocity: 0.2 },
        true,
        lowVelocityAt,
      ),
    );

    await waitForInspectorPeakAbove(inspector, 0.001, {
      description: "low velocity kick output",
    });
    await waitForAudioTime(ctx.context.audioContext, lowVelocityAt + 0.04);
    const lowVelocityPeak = readInspectorPeak(inspector);

    const highVelocityAt = ctx.context.audioContext.currentTime + 0.2;
    drumMachine.onMidiEvent(
      MidiEvent.fromNote(
        { name: "C", octave: 1, velocity: 1 },
        true,
        highVelocityAt,
      ),
    );

    await waitForInspectorPeakAbove(inspector, 0.001, {
      description: "high velocity kick output",
    });
    await waitForAudioTime(ctx.context.audioContext, highVelocityAt + 0.04);
    const highVelocityPeak = readInspectorPeak(inspector);

    expect(highVelocityPeak).toBeGreaterThan(lowVelocityPeak);
  });

  it("uses updated kick level on subsequent triggers", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);
    const inspector = createInspector(ctx);

    await waitForMicrotasks();

    connectOutputToInspector(drumMachine, "kick out", inspector);
    drumMachine.props = { kickLevel: 0.15 };

    const firstTriggerAt = ctx.context.currentTime + 0.01;
    drumMachine.onMidiEvent(MidiEvent.fromNote("C1", true, firstTriggerAt));

    await waitForAudioTime(ctx.context.audioContext, firstTriggerAt + 0.04);
    const lowLevelPeak = readInspectorPeak(inspector);

    drumMachine.props = { kickLevel: 1 };
    const secondTriggerAt = ctx.context.audioContext.currentTime + 0.2;
    drumMachine.onMidiEvent(MidiEvent.fromNote("C1", true, secondTriggerAt));

    await waitForAudioTime(ctx.context.audioContext, secondTriggerAt + 0.04);
    const highLevelPeak = readInspectorPeak(inspector);

    expect(highLevelPeak).toBeGreaterThan(lowLevelPeak * 2);
  });

  it("uses updated open hat decay on subsequent triggers", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);
    const inspector = createInspector(ctx);

    await waitForMicrotasks();

    connectOutputToInspector(drumMachine, "open hat out", inspector);
    drumMachine.props = { openHatDecay: 0.08 };

    const firstTriggerAt = ctx.context.currentTime + 0.01;
    drumMachine.onMidiEvent(MidiEvent.fromNote("A#1", true, firstTriggerAt));

    await waitForAudioTime(ctx.context.audioContext, firstTriggerAt + 0.18);
    const shortDecayPeak = readInspectorPeak(inspector);

    drumMachine.props = { openHatDecay: 1.2 };
    const secondTriggerAt = ctx.context.audioContext.currentTime + 0.2;
    drumMachine.onMidiEvent(MidiEvent.fromNote("A#1", true, secondTriggerAt));

    await waitForAudioTime(ctx.context.audioContext, secondTriggerAt + 0.18);
    const longDecayPeak = readInspectorPeak(inspector);

    expect(longDecayPeak).toBeGreaterThan(shortDecayPeak * 2);
  });

  it("changes the kick waveform when tone changes", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);
    const inspector = createInspector(ctx);

    await waitForMicrotasks();

    connectOutputToInspector(drumMachine, "kick out", inspector);
    drumMachine.props = { kickTone: 0 };

    const firstTriggerAt = ctx.context.currentTime + 0.01;
    drumMachine.onMidiEvent(MidiEvent.fromNote("C1", true, firstTriggerAt));
    await waitForAudioTime(ctx.context.audioContext, firstTriggerAt + 0.03);
    const darkKickBuffer = Float32Array.from(inspector.getValues());

    drumMachine.props = { kickTone: 1 };
    const secondTriggerAt = ctx.context.audioContext.currentTime + 0.25;
    drumMachine.onMidiEvent(MidiEvent.fromNote("C1", true, secondTriggerAt));
    await waitForAudioTime(ctx.context.audioContext, secondTriggerAt + 0.03);
    const brightKickBuffer = Float32Array.from(inspector.getValues());

    expect(readBufferDifference(darkKickBuffer, brightKickBuffer)).toBeGreaterThan(0.5);
  });

  it("chokes an active open hat when a closed hat is triggered", async (ctx) => {
    const drumMachine = createDrumMachine(ctx);
    const openHatInspector = createInspector(ctx);

    await waitForMicrotasks();

    connectOutputToInspector(drumMachine, "open hat out", openHatInspector);
    drumMachine.props = { openHatDecay: 1.5 };

    const openHatAt = ctx.context.currentTime + 0.01;
    drumMachine.onMidiEvent(MidiEvent.fromNote("A#1", true, openHatAt));

    await waitForInspectorPeakAbove(openHatInspector, 0.005, {
      description: "open hat before choke",
    });

    const closedHatAt = openHatAt + 0.05;
    drumMachine.onMidiEvent(MidiEvent.fromNote("F#1", true, closedHatAt));

    await waitForAudioTime(ctx.context.audioContext, closedHatAt + 0.12);

    expect(readInspectorPeak(openHatInspector)).toBeLessThan(0.01);
  });
});
