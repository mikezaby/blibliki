import { describe, expect, it, vi } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import { MidiMappingMode, ModuleType, OscillatorWave } from "@/modules";
import MidiMapper, { MidiMapping } from "@/modules/MidiMapper";
import { waitForMicrotasks } from "../utils/waitForCondition";

const registerMidiOutput = (
  ctx: {
    engine: {
      addModule: (params: {
        name: string;
        moduleType: ModuleType;
        props: Record<string, unknown>;
      }) => { id: string };
      addRoute: (params: {
        source: { moduleId: string; ioName: string };
        destination: { moduleId: string; ioName: string };
      }) => unknown;
      midiDeviceManager: { outputDevices: Map<string, MidiOutputDevice> };
    };
  },
  name: string,
) => {
  const send = vi.fn();
  const outputDevice = new MidiOutputDevice({
    id: `${name}-id`,
    name,
    type: "output",
    state: "connected",
    send,
  });

  ctx.engine.midiDeviceManager.outputDevices.set(outputDevice.id, outputDevice);
  return { send, outputDevice };
};

const connectMapperToMidiOutput = (
  ctx: {
    engine: {
      addModule: (params: {
        name: string;
        moduleType: ModuleType;
        props: Record<string, unknown>;
      }) => { id: string };
      addRoute: (params: {
        source: { moduleId: string; ioName: string };
        destination: { moduleId: string; ioName: string };
      }) => unknown;
    };
  },
  mapperId: string,
  outputDevice: MidiOutputDevice,
) => {
  const midiOutput = ctx.engine.addModule({
    name: "MIDI Out",
    moduleType: ModuleType.MidiOutput,
    props: {
      selectedId: outputDevice.id,
      selectedName: outputDevice.name,
    },
  });

  ctx.engine.addRoute({
    source: { moduleId: mapperId, ioName: "midi out" },
    destination: { moduleId: midiOutput.id, ioName: "midi in" },
  });
};

const quantizeToStep = (value: number, min: number, step: number) =>
  Number((min + Math.round((value - min) / step) * step).toFixed(10));

describe("MidiMapper", () => {
  it("updates mapped props from incoming CC and stores values in runtime state", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const midiMapperSerialized = ctx.engine.addModule({
      name: "midi mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 21,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                mode: MidiMappingMode.direct,
                propName: "gain",
              },
            ],
          },
        ],
        globalMappings: [{} as MidiMapping<ModuleType>],
      },
    });
    const midiMapper = ctx.engine.findModule(
      midiMapperSerialized.id,
    ) as MidiMapper;

    const midiEvent = MidiEvent.fromCC(21, 127, ctx.context.currentTime);
    midiMapper.handleCC(midiEvent, ctx.context.currentTime);

    const gainModule = ctx.engine.findModule(gain.id);
    expect(gainModule.moduleType).toBe(ModuleType.Gain);
    expect((gainModule as any).props.gain).toBe(2);

    const persistedMapping = midiMapper.props.tracks[0]?.mappings[0];
    expect(persistedMapping).toBeDefined();
    expect("value" in (persistedMapping ?? {})).toBe(false);
  });

  it("restores track CC feedback from mapped module props on track switch", async (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const midiMapperSerialized = ctx.engine.addModule({
      name: "midi mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        tracks: [
          { name: "Track 1", mappings: [{} as MidiMapping<ModuleType>] },
          {
            name: "Track 2",
            mappings: [
              {
                cc: 22,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                mode: MidiMappingMode.direct,
                propName: "gain",
              },
            ],
          },
        ],
        globalMappings: [{} as MidiMapping<ModuleType>],
      },
    });
    const midiMapper = ctx.engine.findModule(
      midiMapperSerialized.id,
    ) as MidiMapper;

    const midiOut = midiMapper.outputs.findByName("midi out") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };
    const sentEvents: MidiEvent[] = [];
    const originalOnMidiEvent = midiOut.onMidiEvent.bind(midiOut);

    midiOut.onMidiEvent = (event: MidiEvent) => {
      sentEvents.push(event);
      originalOnMidiEvent(event);
    };

    await waitForMicrotasks();
    sentEvents.length = 0;

    midiMapper.props = { activeTrack: 1 };
    await waitForMicrotasks();

    const matchingEvents = sentEvents.filter((event) => event.cc === 22);
    expect(matchingEvents.length).toBeGreaterThan(0);
    expect(matchingEvents.at(-1)?.ccValue).toBe(64);
  });

  it("restores controller feedback when active track mappings change", async (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const midiMapperSerialized = ctx.engine.addModule({
      name: "midi mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        tracks: [
          {
            name: "Page A",
            mappings: [
              {
                cc: 21,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                mode: MidiMappingMode.direct,
                propName: "gain",
              },
            ],
          },
        ],
        globalMappings: [{} as MidiMapping<ModuleType>],
      },
    });
    const midiMapper = ctx.engine.findModule(
      midiMapperSerialized.id,
    ) as MidiMapper;

    const midiOut = midiMapper.outputs.findByName("midi out") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };
    const sentEvents: MidiEvent[] = [];
    const originalOnMidiEvent = midiOut.onMidiEvent.bind(midiOut);

    midiOut.onMidiEvent = (event: MidiEvent) => {
      sentEvents.push(event);
      originalOnMidiEvent(event);
    };

    await waitForMicrotasks();
    sentEvents.length = 0;

    midiMapper.props = {
      tracks: [
        {
          name: "Page B",
          mappings: [
            {
              cc: 22,
              moduleId: gain.id,
              moduleType: ModuleType.Gain,
              mode: MidiMappingMode.direct,
              propName: "gain",
            },
          ],
        },
      ],
    };
    await waitForMicrotasks();

    const matchingEvents = sentEvents.filter((event) => event.cc === 22);
    expect(matchingEvents.length).toBeGreaterThan(0);
    expect(matchingEvents.at(-1)?.ccValue).toBe(64);
  });

  it("does not emit controller feedback from incoming incDec MIDI events", async (ctx) => {
    const gain = ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
      },
    });

    const { send, outputDevice } = registerMidiOutput(ctx, "LCXL3 DAW Out");
    connectMapperToMidiOutput(ctx, mapperSerialized.id, outputDevice);

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    await waitForMicrotasks();
    send.mockClear();

    mapper.handleCC(MidiEvent.fromCC(13, 110, ctx.context.currentTime), 0);
    send.mockClear();

    mapper.handleCC(MidiEvent.fromCC(13, 111, ctx.context.currentTime), 0);
    await waitForMicrotasks(2);

    expect(send).not.toHaveBeenCalled();
  });

  it("treats the incDec threshold as no movement", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    mapper.handleCC(MidiEvent.fromCC(13, 64, ctx.context.currentTime), 0);

    const gainModule = ctx.engine.findModule(gain.id);
    expect(gainModule.moduleType).toBe(ModuleType.Gain);
    expect((gainModule as any).props.gain).toBe(1);
  });

  it("steps linear number mappings by schema step in incDec mode", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);

    let gainModule = ctx.engine.findModule(gain.id);
    expect(gainModule.moduleType).toBe(ModuleType.Gain);
    expect((gainModule as any).props.gain).toBe(1.01);

    mapper.handleCC(MidiEvent.fromCC(13, 62, ctx.context.currentTime), 0);

    gainModule = ctx.engine.findModule(gain.id);
    expect(gainModule.moduleType).toBe(ModuleType.Gain);
    expect((gainModule as any).props.gain).toBe(0.99);
  });

  it("uses the mapping step override for relative number mappings", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
                step: 0.25,
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);

    const gainModule = ctx.engine.findModule(gain.id);
    expect(gainModule.moduleType).toBe(ModuleType.Gain);
    expect((gainModule as any).props.gain).toBe(1.25);
  });

  it("maps relative number deltas through the schema exponent", (ctx) => {
    const filter = ctx.engine.addModule({
      name: "Filter",
      moduleType: ModuleType.Filter,
      props: { cutoff: 1000 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: filter.id,
                moduleType: ModuleType.Filter,
                propName: "cutoff",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);

    const filterModule = ctx.engine.findModule(filter.id);
    expect(filterModule.moduleType).toBe(ModuleType.Filter);

    const min = 20;
    const max = 20000;
    const exp = 5;
    const step = 1;
    const currentValue = 1000;
    const normalizedValue = Math.pow(
      (currentValue - min) / (max - min),
      1 / exp,
    );
    const nextNormalized = normalizedValue + 1 / 127;
    const expected = quantizeToStep(
      min + Math.pow(nextNormalized, exp) * (max - min),
      min,
      step,
    );

    expect((filterModule as any).props.cutoff).toBe(expected);
  });

  it("steps enum and boolean props with the signed relative delta", (ctx) => {
    const oscillator = ctx.engine.addModule({
      name: "Oscillator",
      moduleType: ModuleType.Oscillator,
      props: {
        wave: OscillatorWave.sine,
        lowGain: false,
      },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: oscillator.id,
                moduleType: ModuleType.Oscillator,
                propName: "wave",
              },
              {
                cc: 14,
                mode: MidiMappingMode.incDec,
                moduleId: oscillator.id,
                moduleType: ModuleType.Oscillator,
                propName: "lowGain",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    mapper.handleCC(MidiEvent.fromCC(13, 68, ctx.context.currentTime), 0);
    mapper.handleCC(MidiEvent.fromCC(14, 65, ctx.context.currentTime), 0);

    let oscillatorModule = ctx.engine.findModule(oscillator.id);
    expect(oscillatorModule.moduleType).toBe(ModuleType.Oscillator);
    expect((oscillatorModule as any).props.wave).toBe(OscillatorWave.square);
    expect((oscillatorModule as any).props.lowGain).toBe(true);

    mapper.handleCC(MidiEvent.fromCC(13, 62, ctx.context.currentTime), 0);
    mapper.handleCC(MidiEvent.fromCC(14, 63, ctx.context.currentTime), 0);

    oscillatorModule = ctx.engine.findModule(oscillator.id);
    expect(oscillatorModule.moduleType).toBe(ModuleType.Oscillator);
    expect((oscillatorModule as any).props.wave).toBe(OscillatorWave.triangle);
    expect((oscillatorModule as any).props.lowGain).toBe(false);
  });

  it("accumulates low-end exponential motion for envelope attack", (ctx) => {
    const envelope = ctx.engine.addModule({
      name: "Envelope",
      moduleType: ModuleType.Envelope,
      props: { attack: 0, decay: 0, sustain: 1, release: 0.1 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: envelope.id,
                moduleType: ModuleType.Envelope,
                propName: "attack",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    for (let index = 0; index < 48; index += 1) {
      mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);
    }

    const envelopeModule = ctx.engine.findModule(envelope.id);
    expect(envelopeModule.moduleType).toBe(ModuleType.Envelope);
    expect((envelopeModule as any).props.attack).toBe(0.01);
  });

  it("accumulates low-end exponential motion for envelope decay", (ctx) => {
    const envelope = ctx.engine.addModule({
      name: "Envelope",
      moduleType: ModuleType.Envelope,
      props: { attack: 0, decay: 0, sustain: 1, release: 0.1 },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: envelope.id,
                moduleType: ModuleType.Envelope,
                propName: "decay",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    for (let index = 0; index < 44; index += 1) {
      mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);
    }

    const envelopeModule = ctx.engine.findModule(envelope.id);
    expect(envelopeModule.moduleType).toBe(ModuleType.Envelope);
    expect((envelopeModule as any).props.decay).toBe(0.01);
  });

  it("requires accumulated motion before changing enum props", (ctx) => {
    const oscillator = ctx.engine.addModule({
      name: "Oscillator",
      moduleType: ModuleType.Oscillator,
      props: { wave: OscillatorWave.sine },
    });

    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activeTrack: 0,
        globalMappings: [],
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.incDec,
                moduleId: oscillator.id,
                moduleType: ModuleType.Oscillator,
                propName: "wave",
              },
            ],
          },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    if (mapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);

    let oscillatorModule = ctx.engine.findModule(oscillator.id);
    expect(oscillatorModule.moduleType).toBe(ModuleType.Oscillator);
    expect((oscillatorModule as any).props.wave).toBe(OscillatorWave.sine);

    mapper.handleCC(MidiEvent.fromCC(13, 65, ctx.context.currentTime), 0);

    oscillatorModule = ctx.engine.findModule(oscillator.id);
    expect(oscillatorModule.moduleType).toBe(ModuleType.Oscillator);
    expect((oscillatorModule as any).props.wave).toBe(OscillatorWave.triangle);
  });
});
