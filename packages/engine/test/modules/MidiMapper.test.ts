import { describe, expect, it, vi } from "vitest";
import MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import { MidiMappingMode, ModuleType } from "@/modules";

const flushMicrotasks = async () => {
  await Promise.resolve();
};

const registerMidiOutput = (
  ctx: {
    engine: {
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
  return send;
};

describe("MidiMapper", () => {
  it("sends Launch Control encoder feedback on DAW channel 16", async (ctx) => {
    const send = registerMidiOutput(ctx, "LCXL3 DAW Out");

    const gain = ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1.5 },
    });

    const mapper = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activePage: 0,
        globalMappings: [],
        pages: [
          {
            name: "Page 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.direct,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
      },
    });

    await flushMicrotasks();
    send.mockClear();

    const midiMapper = ctx.engine.findModule(mapper.id);
    if (midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    midiMapper.syncControllerValues();

    expect(send).toHaveBeenCalledWith(
      new Uint8Array([0xbf, 13, 95]),
      undefined,
    );
  });

  it("matches Launch Control outputs that expose full DAW port names", async (ctx) => {
    const send = registerMidiOutput(ctx, "Launch Control XL 3 DAW");

    const gain = ctx.engine.addModule({
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1.5 },
    });

    const mapper = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activePage: 0,
        globalMappings: [],
        pages: [
          {
            name: "Page 1",
            mappings: [
              {
                cc: 13,
                mode: MidiMappingMode.direct,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
      },
    });

    await flushMicrotasks();
    send.mockClear();

    const midiMapper = ctx.engine.findModule(mapper.id);
    if (midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    midiMapper.syncControllerValues();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      new Uint8Array([0xbf, 13, 95]),
      undefined,
    );
  });
});
