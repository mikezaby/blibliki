import type { TestContext } from "vitest";
import { describe, expect, it } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import Inspector from "@/modules/Inspector";
import {
  waitForInspectorPeakAbove,
  waitForInspectorValue,
} from "../utils/audioWaits";
import { waitForMicrotasks } from "../utils/waitForCondition";

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
});
