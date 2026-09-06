// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it, vi } from "vitest";
import {
  referencedAudioModules,
  SpectrumTaps,
} from "../../src/video/spectrumTaps";

const bins = new Float32Array([-30, -40]);

function fakeEngine() {
  let next = 0;
  const taps = new Map<string, unknown>();
  const engine = {
    addModule: vi.fn(() => {
      const id = `tap${++next}`;
      taps.set(id, {
        getFrequencies: () => bins,
        audioNode: { context: { sampleRate: 48000 } },
      });
      return { id };
    }),
    addRoute: vi.fn((route: { source: unknown }) => ({
      id: `r${next}`,
      ...route,
    })),
    removeRoute: vi.fn(),
    removeModule: vi.fn((id: string) => taps.delete(id)),
    findModule: (id: string) => {
      if (taps.has(id)) return taps.get(id);
      if (id === "osc" || id === "poly") {
        return {
          outputs: {
            collection: [
              { name: "midi out", isAudio: () => false },
              { name: "out", isAudio: () => true },
            ],
          },
        };
      }
      throw new Error(`Module ${id} not found`);
    },
  };

  return engine;
}

describe("referencedAudioModules", () => {
  it("collects the audio module every Band points at, once", () => {
    const modules = [
      {
        id: "b1",
        name: "b1",
        moduleType: VideoModuleType.Band,
        props: { moduleId: "osc" },
      },
      {
        id: "b2",
        name: "b2",
        moduleType: VideoModuleType.Band,
        props: { moduleId: "osc" },
      },
      {
        id: "b3",
        name: "b3",
        moduleType: VideoModuleType.Band,
        props: { moduleId: "" },
      },
      {
        id: "ap",
        name: "ap",
        moduleType: VideoModuleType.AudioProp,
        props: { moduleId: "osc", prop: "x" },
      },
    ];

    expect([...referencedAudioModules(modules)]).toEqual(["osc"]);
  });
});

describe("SpectrumTaps", () => {
  it("creates one analyser per referenced module, tapped from its first audio output", () => {
    const engine = fakeEngine();
    const taps = new SpectrumTaps(engine as never);

    taps.sync(new Set(["osc"]));
    taps.sync(new Set(["osc"]));

    expect(engine.addModule).toHaveBeenCalledTimes(1);
    expect(engine.addModule).toHaveBeenCalledWith(
      expect.objectContaining({ moduleType: ModuleType.Spectrum }),
    );
    expect(engine.addRoute).toHaveBeenCalledWith({
      source: { moduleId: "osc", ioName: "out" },
      destination: { moduleId: "tap1", ioName: "in" },
    });
    expect([...taps.read()]).toEqual([{ id: "osc", bins, sampleRate: 48000 }]);
  });

  it("removes the analyser when no Band references the module any more", () => {
    const engine = fakeEngine();
    const taps = new SpectrumTaps(engine as never);

    taps.sync(new Set(["osc", "poly"]));
    taps.sync(new Set(["poly"]));

    expect(engine.removeRoute).toHaveBeenCalledWith("r1");
    expect(engine.removeModule).toHaveBeenCalledWith("tap1");
    expect([...taps.read()].map((s) => s.id)).toEqual(["poly"]);
  });

  it("skips modules the engine does not have", () => {
    const engine = fakeEngine();
    const taps = new SpectrumTaps(engine as never);

    taps.sync(new Set(["gone"]));

    expect(engine.addModule).not.toHaveBeenCalled();
    expect([...taps.read()]).toEqual([]);
  });

  it("drops every tap on dispose", () => {
    const engine = fakeEngine();
    const taps = new SpectrumTaps(engine as never);

    taps.sync(new Set(["osc", "poly"]));
    taps.dispose();

    expect(engine.removeModule).toHaveBeenCalledTimes(2);
    expect([...taps.read()]).toEqual([]);
  });
});
