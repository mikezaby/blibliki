import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import BaseBlock from "@/blocks/BaseBlock";
import ThreeOscBlock from "@/blocks/source/ThreeOscBlock";
import { compileTrack } from "@/compiler/compileTrack";
import { createPage, EMPTY_SLOT_REF } from "@/pages/Page";
import BaseTrack from "@/tracks/BaseTrack";
import Track from "@/tracks/Track";
import type { Fixed8 } from "@/types";

class VirtualMidiSourceBlock extends BaseBlock {
  constructor() {
    super("fx1", "virtualMidiSource");

    this.addModule({
      id: "fx1.main",
      name: "Virtual Midi",
      moduleType: ModuleType.VirtualMidi,
      props: {
        activeNotes: [],
      },
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [{ moduleId: "fx1.main", ioName: "midi in" }],
    });

    this.addOutput({
      ioName: "midi out",
      kind: "midi",
      plugs: [{ moduleId: "fx1.main", ioName: "midi out" }],
    });
  }
}

class FanoutTrack extends BaseTrack {
  constructor() {
    super("fanout-track", { voices: 1, midiChannel: 1 });

    this.addBlock(new VirtualMidiSourceBlock());
    this.addBlock(new ThreeOscBlock());

    this.addRoute({
      source: { blockKey: "fx1", ioName: "midi out" },
      destination: { blockKey: "source", ioName: "midi in" },
    });

    const emptySlots = [
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
    ] as Fixed8<
      | typeof EMPTY_SLOT_REF
      | { kind: "slot"; blockKey: "source"; slotKey: "wave1" }
    >;

    this.setPage(createPage("sourceAmp", emptySlots, emptySlots));
  }
}

describe("compileTrack", () => {
  it("should compile the default track into engine-ready modules, routes, and resolved pages", () => {
    const compiled = compileTrack(new Track("track-1"));

    expect(compiled.key).toBe("track-1");
    expect(compiled.engine.modules.map((module) => module.id).sort()).toEqual([
      "amp.envelope",
      "amp.gain",
      "filter.constant",
      "filter.envelope",
      "filter.main",
      "fx1.main",
      "fx2.main",
      "fx3.main",
      "fx4.main",
      "lfo1.main",
      "source.main",
      "trackGain.main",
    ]);

    expect(
      compiled.engine.routes.map(({ source, destination }) => ({
        source,
        destination,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          source: { moduleId: "amp.envelope", ioName: "out" },
          destination: { moduleId: "amp.gain", ioName: "in" },
        },
        {
          source: { moduleId: "filter.constant", ioName: "out" },
          destination: { moduleId: "filter.envelope", ioName: "in" },
        },
        {
          source: { moduleId: "filter.envelope", ioName: "out" },
          destination: { moduleId: "filter.main", ioName: "cutoffMod" },
        },
        {
          source: { moduleId: "source.main", ioName: "out" },
          destination: { moduleId: "amp.envelope", ioName: "in" },
        },
        {
          source: { moduleId: "amp.gain", ioName: "out" },
          destination: { moduleId: "filter.main", ioName: "in" },
        },
        {
          source: { moduleId: "filter.main", ioName: "out" },
          destination: { moduleId: "fx1.main", ioName: "in" },
        },
      ]),
    );

    expect(compiled.launchControlXL3.pages).toEqual([
      {
        controllerPage: 1,
        midiMapperTrackIndex: 0,
        pageKey: "sourceAmp",
      },
      {
        controllerPage: 2,
        midiMapperTrackIndex: 1,
        pageKey: "filterMod",
      },
      {
        controllerPage: 3,
        midiMapperTrackIndex: 2,
        pageKey: "fx",
      },
    ]);

    expect(compiled.launchControlXL3.midiMapper.activeTrack).toBe(0);
    expect(compiled.launchControlXL3.midiMapper.globalMappings).toEqual([]);
    expect(
      compiled.launchControlXL3.midiMapper.tracks.map((track) => track.name),
    ).toEqual(["sourceAmp", "filterMod", "fx"]);
    const sourceAmpMappings = compiled.launchControlXL3.midiMapper.tracks[0];
    expect(sourceAmpMappings).toBeDefined();
    if (!sourceAmpMappings) {
      throw new Error("Expected sourceAmp MidiMapper track to exist");
    }

    expect(
      sourceAmpMappings.mappings.map(
        ({ cc, moduleId, moduleType, propName, mode }) => ({
          cc,
          moduleId,
          moduleType,
          propName,
          mode,
        }),
      ),
    ).toEqual([
      {
        cc: 21,
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propName: "wave",
        mode: "incDec",
      },
      {
        cc: 22,
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propName: "frequency",
        mode: "incDec",
      },
      {
        cc: 23,
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propName: "octave",
        mode: "incDec",
      },
      {
        cc: 24,
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propName: "coarse",
        mode: "incDec",
      },
      {
        cc: 25,
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propName: "fine",
        mode: "incDec",
      },
      {
        cc: 26,
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propName: "lowGain",
        mode: "incDec",
      },
      {
        cc: 29,
        moduleId: "amp.envelope",
        moduleType: ModuleType.Envelope,
        propName: "attack",
        mode: "incDec",
      },
      {
        cc: 30,
        moduleId: "amp.envelope",
        moduleType: ModuleType.Envelope,
        propName: "decay",
        mode: "incDec",
      },
      {
        cc: 31,
        moduleId: "amp.envelope",
        moduleType: ModuleType.Envelope,
        propName: "sustain",
        mode: "incDec",
      },
      {
        cc: 32,
        moduleId: "amp.envelope",
        moduleType: ModuleType.Envelope,
        propName: "release",
        mode: "incDec",
      },
      {
        cc: 36,
        moduleId: "amp.gain",
        moduleType: ModuleType.Gain,
        propName: "gain",
        mode: "incDec",
      },
    ]);

    const sourceAmpPage = compiled.pages.find(
      (page) => page.key === "sourceAmp",
    );
    const filterModPage = compiled.pages.find(
      (page) => page.key === "filterMod",
    );
    expect(sourceAmpPage?.regions[0].slots[0]).toMatchObject({
      kind: "slot",
      blockKey: "source",
      blockType: "osc",
      slotKey: "wave",
      label: "Waveform",
      shortLabel: "WAVE",
      binding: {
        kind: "module-prop",
        moduleId: "source.main",
        moduleType: ModuleType.Oscillator,
        propKey: "wave",
      },
    });
    expect(sourceAmpPage?.regions[1].slots[0]).toMatchObject({
      kind: "slot",
      blockKey: "amp",
      slotKey: "attack",
      label: "Attack",
      shortLabel: "A",
      binding: {
        kind: "module-prop",
        moduleId: "amp.envelope",
        moduleType: ModuleType.Envelope,
        propKey: "attack",
      },
    });
    expect(sourceAmpPage?.regions[1].slots[4]).toEqual({ kind: "empty" });
    expect(filterModPage?.regions[1].slots[0]).toMatchObject({
      kind: "slot",
      blockKey: "lfo1",
      blockType: "lfo",
      slotKey: "waveform",
      label: "Waveform",
      shortLabel: "WAVE",
      binding: {
        kind: "module-prop",
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propKey: "waveform",
      },
    });
    expect(
      compiled.launchControlXL3.resolvedPages[0]?.regions[0].slots[0],
    ).toEqual(
      expect.objectContaining({
        kind: "slot",
        cc: 21,
        controllerColumn: 0,
        controllerRow: "top",
      }),
    );
    expect(
      compiled.launchControlXL3.midiMapper.tracks[1]?.mappings.map(
        ({ cc, moduleId, moduleType, propName }) => ({
          cc,
          moduleId,
          moduleType,
          propName,
        }),
      ),
    ).toEqual([
      {
        cc: 21,
        moduleId: "filter.main",
        moduleType: ModuleType.Filter,
        propName: "cutoff",
      },
      {
        cc: 22,
        moduleId: "filter.main",
        moduleType: ModuleType.Filter,
        propName: "Q",
      },
      {
        cc: 23,
        moduleId: "filter.main",
        moduleType: ModuleType.Filter,
        propName: "type",
      },
      {
        cc: 24,
        moduleId: "filter.main",
        moduleType: ModuleType.Filter,
        propName: "envelopeAmount",
      },
      {
        cc: 25,
        moduleId: "filter.envelope",
        moduleType: ModuleType.Envelope,
        propName: "attack",
      },
      {
        cc: 26,
        moduleId: "filter.envelope",
        moduleType: ModuleType.Envelope,
        propName: "decay",
      },
      {
        cc: 27,
        moduleId: "filter.envelope",
        moduleType: ModuleType.Envelope,
        propName: "sustain",
      },
      {
        cc: 28,
        moduleId: "filter.envelope",
        moduleType: ModuleType.Envelope,
        propName: "release",
      },
      {
        cc: 29,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "waveform",
      },
      {
        cc: 30,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "frequency",
      },
      {
        cc: 31,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "division",
      },
      {
        cc: 32,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "offset",
      },
      {
        cc: 33,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "amount",
      },
      {
        cc: 34,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "sync",
      },
      {
        cc: 35,
        moduleId: "lfo1.main",
        moduleType: ModuleType.LFO,
        propName: "phase",
      },
    ]);
  });

  it("should expand track routes through multi-plug block IOs", () => {
    const compiled = compileTrack(new FanoutTrack());

    expect(
      compiled.engine.routes.map(({ source, destination }) => ({
        source,
        destination,
      })),
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
      {
        source: { moduleId: "fx1.main", ioName: "midi out" },
        destination: { moduleId: "source.osc1", ioName: "midi in" },
      },
      {
        source: { moduleId: "fx1.main", ioName: "midi out" },
        destination: { moduleId: "source.osc2", ioName: "midi in" },
      },
      {
        source: { moduleId: "fx1.main", ioName: "midi out" },
        destination: { moduleId: "source.osc3", ioName: "midi in" },
      },
    ]);
  });
});
