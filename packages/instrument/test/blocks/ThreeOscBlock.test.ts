import { describe, expect, it } from "vitest";
import ThreeOscBlock from "@/blocks/source/ThreeOscBlock";

describe("ThreeOscBlock", () => {
  it("should fan out the exported midi input to the three oscillator modules", () => {
    const block = new ThreeOscBlock();
    const midiIn = block.findInput("midi in");

    expect(midiIn.plugs).toEqual([
      { moduleId: "source.osc1", ioName: "midi in" },
      { moduleId: "source.osc2", ioName: "midi in" },
      { moduleId: "source.osc3", ioName: "midi in" },
    ]);
  });

  it("should route the three oscillators into the shared mixer output", () => {
    const block = new ThreeOscBlock();
    const routes = Array.from(block.routes.values());

    expect(routes).toHaveLength(3);
    for (const route of routes) {
      expect(typeof route.id).toBe("string");
    }

    expect(
      routes.map(({ source, destination }) => ({ source, destination })),
    ).toEqual([
      {
        source: { moduleId: "source.osc1", ioName: "out" },
        destination: { moduleId: "source.mix", ioName: "in" },
      },
      {
        source: { moduleId: "source.osc2", ioName: "out" },
        destination: { moduleId: "source.mix", ioName: "in" },
      },
      {
        source: { moduleId: "source.osc3", ioName: "out" },
        destination: { moduleId: "source.mix", ioName: "in" },
      },
    ]);

    expect(block.findOutput("out").plugs).toEqual([
      { moduleId: "source.mix", ioName: "out" },
    ]);
  });

  it("should expose per-oscillator slots plus the shared mix slot", () => {
    const block = new ThreeOscBlock();

    expect(Array.from(block.slots.keys())).toEqual([
      "wave1",
      "frequency1",
      "fine1",
      "coarse1",
      "octave1",
      "lowGain1",
      "wave2",
      "frequency2",
      "fine2",
      "coarse2",
      "octave2",
      "lowGain2",
      "wave3",
      "frequency3",
      "fine3",
      "coarse3",
      "octave3",
      "lowGain3",
      "gain",
    ]);
  });
});
