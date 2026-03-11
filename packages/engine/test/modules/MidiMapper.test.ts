import { describe, expect, it, vi } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import { MidiMappingMode, ModuleType } from "@/modules";
import MidiMapper, { MidiMapping } from "@/modules/MidiMapper";

const flushMicrotasks = async () => {
  await Promise.resolve();
};

const flushFrame = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 20);
  });
};

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

    await flushMicrotasks();
    sentEvents.length = 0;

    midiMapper.props = { activeTrack: 1 };
    await flushMicrotasks();

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

    await flushMicrotasks();
    send.mockClear();

    mapper.handleCC(MidiEvent.fromCC(13, 110, ctx.context.currentTime), 0);
    send.mockClear();

    mapper.handleCC(MidiEvent.fromCC(13, 111, ctx.context.currentTime), 0);
    await flushFrame();

    expect(send).not.toHaveBeenCalled();
  });
});
