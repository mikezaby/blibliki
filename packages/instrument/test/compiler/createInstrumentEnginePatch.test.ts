import type { IMidiMapperProps } from "@blibliki/engine";
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

// The master track replaces the former global effect chain: every track's
// audio out feeds the master track's audio in (its filter block), and the
// master track's output gain feeds the engine Master.
const MASTER_IN = "master.filter.main";
const MASTER_OUT = "master.trackGain.main";
const ENGINE_MASTER = "instrument.runtime.master";

function hasRoute(
  routes: ReturnType<typeof createInstrumentEnginePatch>["patch"]["routes"],
  sourceModuleId: string,
  destinationModuleId: string,
) {
  return routes.some(
    ({ source, destination }) =>
      source.moduleId === sourceModuleId &&
      source.ioName === "out" &&
      destination.moduleId === destinationModuleId &&
      destination.ioName === "in",
  );
}

// Replaces the note tracks with the given ones while preserving the required
// master track, so the compiled instrument always has its master bus.
function useNoteTracks(
  document: ReturnType<typeof createDefaultInstrumentDocument>,
  noteTracks: ReturnType<typeof createDefaultInstrumentDocument>["tracks"],
) {
  const master = document.tracks.find(
    (track) => track.audioSource?.type === "master",
  )!;
  document.tracks = [...noteTracks, master];
}

describe("createInstrumentEnginePatch", () => {
  it("converts version 1 master gain when creating the runtime volume module", () => {
    const document = createDefaultInstrumentDocument();
    document.version = "1";
    document.globalBlock.masterVolume = 0.5;

    const runtime = createInstrumentEnginePatch(document);
    const masterVolume = runtime.patch.modules.find(
      (module) => module.id === MASTER_OUT,
    );

    expect(masterVolume?.moduleType).toBe(ModuleType.Volume);
    expect(
      (masterVolume?.props as { volume: number } | undefined)?.volume,
    ).toBeCloseTo(-6.02, 2);
  });

  it("builds one shared engine patch with track-owned midi channel filters", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "osc",
    };

    const runtime = createInstrumentEnginePatch(document);

    expect(runtime.compiledInstrument.tracks).toHaveLength(8);
    expect(runtime.runtime).toMatchObject({
      masterId: "instrument.runtime.master",
      transportControlId: "instrument.runtime.transportControl",
      midiMapperId: "instrument.runtime.midiMapper",
      noteInputId: "instrument.runtime.noteInput",
      controllerInputId: "instrument.runtime.controllerInput",
      controllerOutputId: "instrument.runtime.controllerOutput",
      navigation: {
        activeTrackIndex: 0,
        activePage: "sourceAmp",
        mode: "performance",
        shiftPressed: false,
        sequencerPageIndex: 0,
        selectedStepIndex: 0,
      },
      stepSequencerIds: {},
    });
    expect(runtime.runtime.midiMapperGlobalMappings).toEqual(
      expect.arrayContaining([]),
    );

    expect(
      runtime.patch.modules
        .map(({ id, moduleType }) => ({ id, moduleType }))
        .filter(
          ({ id }) =>
            id === "instrument.runtime.noteInput" ||
            id === "instrument.runtime.controllerInput" ||
            id === "instrument.runtime.controllerOutput" ||
            id === "instrument.runtime.midiMapper" ||
            id === "instrument.runtime.transportControl" ||
            id === "instrument.runtime.master" ||
            id === "master.filter.main" ||
            id === "master.trackGain.main" ||
            id === "track-1.runtime.midiChannelFilter" ||
            id === "track-1.runtime.voiceScheduler" ||
            id === "track-1.source.main" ||
            id === "track-7.fx4.main" ||
            id === "track-7.trackGain.main",
        )
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual([
      {
        id: "instrument.runtime.controllerInput",
        moduleType: ModuleType.MidiInput,
      },
      {
        id: "instrument.runtime.controllerOutput",
        moduleType: ModuleType.MidiOutput,
      },
      {
        id: "instrument.runtime.master",
        moduleType: ModuleType.Master,
      },
      {
        id: "instrument.runtime.midiMapper",
        moduleType: ModuleType.MidiMapper,
      },
      {
        id: "instrument.runtime.noteInput",
        moduleType: ModuleType.MidiInput,
      },
      {
        id: "instrument.runtime.transportControl",
        moduleType: ModuleType.TransportControl,
      },
      {
        id: "master.filter.main",
        moduleType: ModuleType.Filter,
      },
      {
        id: "master.trackGain.main",
        moduleType: ModuleType.Volume,
      },
      {
        id: "track-1.runtime.midiChannelFilter",
        moduleType: ModuleType.MidiChannelFilter,
      },
      {
        id: "track-1.runtime.voiceScheduler",
        moduleType: ModuleType.VoiceScheduler,
      },
      {
        id: "track-1.source.main",
        moduleType: ModuleType.Oscillator,
      },
      {
        id: "track-7.fx4.main",
        moduleType: ModuleType.Reverb,
      },
      {
        id: "track-7.trackGain.main",
        moduleType: ModuleType.Volume,
      },
    ]);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.noteInput" &&
          source.ioName === "midi out" &&
          destination.moduleId === "track-1.runtime.midiChannelFilter" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.runtime.midiChannelFilter" &&
          source.ioName === "midi out" &&
          destination.moduleId === "track-1.runtime.voiceScheduler" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.runtime.voiceScheduler" &&
          source.ioName === "midi out" &&
          destination.moduleId === "track-1.source.main" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);

    // Every note track feeds the master track's audio in (its filter block).
    expect(
      hasRoute(runtime.patch.routes, "track-7.trackGain.main", MASTER_IN),
    ).toBe(true);

    // The master track output feeds the engine Master.
    expect(hasRoute(runtime.patch.routes, MASTER_OUT, ENGINE_MASTER)).toBe(
      true,
    );

    const midiMapper = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.midiMapperId,
    );
    expect(midiMapper).toBeDefined();
    if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;

    // 7 note tracks plus the master track (a normal navigable track).
    expect(midiMapperProps.tracks).toHaveLength(8);
    expect(midiMapperProps.activeTrack).toBe(0);
    expect(midiMapperProps.tracks[0]?.name).toBe("track-1");
    expect(midiMapperProps.tracks[0]?.mappings[0]).toEqual(
      expect.objectContaining({
        moduleId: "track-1.source.main",
        mode: "incDec",
      }),
    );
    expect(midiMapperProps.tracks[7]?.name).toBe("Master");
    expect(midiMapperProps.globalMappings).toEqual([
      expect.objectContaining({
        cc: 13,
        moduleId: "instrument.runtime.transportControl",
        moduleType: ModuleType.TransportControl,
        propName: "bpm",
        mode: "incDec",
      }),
      expect.objectContaining({
        cc: 14,
        moduleId: "instrument.runtime.transportControl",
        moduleType: ModuleType.TransportControl,
        propName: "swing",
        mode: "incDec",
      }),
      expect.objectContaining({
        cc: 20,
        moduleId: "master.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "incDec",
      }),
      expect.objectContaining({
        cc: 5,
        moduleId: "track-1.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 6,
        moduleId: "track-2.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 7,
        moduleId: "track-3.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 8,
        moduleId: "track-4.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 9,
        moduleId: "track-5.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 10,
        moduleId: "track-6.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 11,
        moduleId: "track-7.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
      expect.objectContaining({
        cc: 12,
        moduleId: "master.trackGain.main",
        moduleType: ModuleType.Volume,
        propName: "volume",
        mode: "direct",
      }),
    ]);
    expect(
      midiMapperProps.globalMappings.some((mapping) => mapping.cc === 19),
    ).toBe(false);
  });

  it("only builds runtime modules and midi mappings for enabled tracks", () => {
    const document = createDefaultInstrumentDocument();
    const track2 = document.tracks[1];
    const track6 = document.tracks[5];

    if (!track2 || !track6) {
      throw new Error("Expected default document to expose tracks 2 and 6");
    }

    document.tracks = document.tracks.map((track, index) => ({
      ...track,
      // Keep the master track enabled; the instrument requires it.
      enabled:
        index === 1 || index === 5 || track.audioSource?.type === "master",
    }));
    document.tracks[1] = {
      ...track2,
      enabled: true,
      sourceProfileId: "osc",
      noteSource: "externalMidi",
    };
    document.tracks[5] = {
      ...track6,
      enabled: true,
      sourceProfileId: "threeOsc",
      noteSource: "stepSequencer",
    };

    const runtime = createInstrumentEnginePatch(document);

    expect(runtime.compiledInstrument.tracks.map((track) => track.key)).toEqual(
      ["track-2", "track-6", "master"],
    );
    expect(runtime.runtime.navigation.activeTrackIndex).toBe(0);
    expect(runtime.runtime.stepSequencerIds).toEqual({
      "track-6": "track-6.runtime.stepSequencer",
    });

    const patchModuleIds = runtime.patch.modules.map((module) => module.id);
    expect(patchModuleIds).toContain("track-2.runtime.midiChannelFilter");
    expect(patchModuleIds).toContain("track-2.runtime.voiceScheduler");
    expect(patchModuleIds).toContain("track-6.runtime.stepSequencer");
    expect(patchModuleIds).toContain("track-6.runtime.voiceScheduler");
    expect(patchModuleIds).not.toContain("track-6.runtime.midiChannelFilter");
    expect(patchModuleIds).not.toContain("track-1.runtime.midiChannelFilter");
    expect(patchModuleIds).not.toContain("track-3.runtime.midiChannelFilter");
    expect(patchModuleIds).not.toContain("track-4.runtime.stepSequencer");

    const midiMapper = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.midiMapperId,
    );
    expect(midiMapper).toBeDefined();
    if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;

    expect(midiMapperProps.tracks).toHaveLength(3);
    expect(midiMapperProps.tracks.map((track) => track.name)).toEqual([
      "track-2",
      "track-6",
      "Master",
    ]);
    expect(midiMapperProps.globalMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cc: 12,
          moduleId: "master.trackGain.main",
          moduleType: ModuleType.Volume,
          propName: "volume",
          mode: "direct",
        }),
      ]),
    );
  });

  it("keeps a processing-track sequencer without voice note runtime", () => {
    const document = createDefaultInstrumentDocument();
    const track2 = document.tracks[1];

    if (!track2) {
      throw new Error("Expected default document to expose track 2");
    }

    document.tracks[1] = {
      ...track2,
      noteSource: "stepSequencer",
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };

    const runtime = createInstrumentEnginePatch(document);
    const moduleIds = runtime.patch.modules.map((module) => module.id);

    expect(moduleIds).not.toContain("track-2.runtime.midiChannelFilter");
    expect(moduleIds).not.toContain("track-2.runtime.voiceScheduler");
    expect(moduleIds).toContain("track-2.runtime.stepSequencer");
    expect(runtime.runtime.stepSequencerIds).toEqual({
      "track-2": "track-2.runtime.stepSequencer",
    });
  });

  it("does not create shared note input for processing-only tracks", () => {
    const document = createDefaultInstrumentDocument();
    useNoteTracks(document, [
      {
        ...document.tracks[0]!,
        audioSource: {
          type: "track",
          trackKey: "missing-track",
          mode: "parallel",
        },
      },
    ]);

    const runtime = createInstrumentEnginePatch(document);

    expect(runtime.runtime.noteInputId).toBeUndefined();
    expect(
      runtime.patch.modules.some(
        (module) => module.id === "instrument.runtime.noteInput",
      ),
    ).toBe(false);
  });

  it("uses All ins for note input and excludes the controller port by default", () => {
    const document = createDefaultInstrumentDocument();

    const runtime = createInstrumentEnginePatch(document);

    const noteInput = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.noteInputId,
    );

    expect(noteInput).toBeDefined();
    expect(noteInput?.moduleType).toBe(ModuleType.MidiInput);
    expect(noteInput?.props).toEqual(
      expect.objectContaining({
        allIns: true,
        selectedId: null,
        selectedName: "All ins",
        excludedIds: ["computer_keyboard"],
        excludedNames: ["LCXL3 DAW In"],
      }),
    );
  });

  it("routes only the explicit track audio out into the instrument master chain", () => {
    const document = createDefaultInstrumentDocument();

    const runtime = createInstrumentEnginePatch(document);

    expect(
      hasRoute(runtime.patch.routes, "track-1.trackGain.main", MASTER_IN),
    ).toBe(true);

    expect(hasRoute(runtime.patch.routes, "track-1.lfo1.main", MASTER_IN)).toBe(
      false,
    );
  });

  it("routes a parallel processing track while keeping both master routes", () => {
    const document = createDefaultInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 2));
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };

    const { patch } = createInstrumentEnginePatch(document);

    expect(
      hasRoute(patch.routes, "track-1.fx4.main", "track-2.filter.main"),
    ).toBe(true);
    expect(hasRoute(patch.routes, "track-1.trackGain.main", MASTER_IN)).toBe(
      true,
    );
    expect(hasRoute(patch.routes, "track-2.trackGain.main", MASTER_IN)).toBe(
      true,
    );
  });

  it("routes a serial processing track without the source master route", () => {
    const document = createDefaultInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 2));
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "serial",
      },
    };

    const { patch } = createInstrumentEnginePatch(document);

    expect(
      hasRoute(patch.routes, "track-1.fx4.main", "track-2.filter.main"),
    ).toBe(true);
    expect(hasRoute(patch.routes, "track-1.trackGain.main", MASTER_IN)).toBe(
      false,
    );
    expect(hasRoute(patch.routes, "track-2.trackGain.main", MASTER_IN)).toBe(
      true,
    );
  });

  it("routes a serial processing chain through each track", () => {
    const document = createDefaultInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 3));
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "serial",
      },
    };
    document.tracks[2] = {
      ...document.tracks[2]!,
      audioSource: {
        type: "track",
        trackKey: "track-2",
        mode: "serial",
      },
    };

    const { patch } = createInstrumentEnginePatch(document);

    expect(
      hasRoute(patch.routes, "track-1.fx4.main", "track-2.filter.main"),
    ).toBe(true);
    expect(
      hasRoute(patch.routes, "track-2.fx4.main", "track-3.filter.main"),
    ).toBe(true);
    expect(hasRoute(patch.routes, "track-1.trackGain.main", MASTER_IN)).toBe(
      false,
    );
    expect(hasRoute(patch.routes, "track-2.trackGain.main", MASTER_IN)).toBe(
      false,
    );
    expect(hasRoute(patch.routes, "track-3.trackGain.main", MASTER_IN)).toBe(
      true,
    );
  });

  it("supports serial and parallel destinations from one source", () => {
    const document = createDefaultInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 3));
    document.tracks[1] = {
      ...document.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "serial",
      },
    };
    document.tracks[2] = {
      ...document.tracks[2]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };

    const { patch } = createInstrumentEnginePatch(document);

    expect(
      hasRoute(patch.routes, "track-1.fx4.main", "track-2.filter.main"),
    ).toBe(true);
    expect(
      hasRoute(patch.routes, "track-1.fx4.main", "track-3.filter.main"),
    ).toBe(true);
    expect(hasRoute(patch.routes, "track-1.trackGain.main", MASTER_IN)).toBe(
      false,
    );
    expect(hasRoute(patch.routes, "track-2.trackGain.main", MASTER_IN)).toBe(
      true,
    );
    expect(hasRoute(patch.routes, "track-3.trackGain.main", MASTER_IN)).toBe(
      true,
    );
  });

  it("ignores disabled tracks without repairing their serial chains", () => {
    const document = createDefaultInstrumentDocument();
    useNoteTracks(document, document.tracks.slice(0, 3));
    document.tracks[1] = {
      ...document.tracks[1]!,
      enabled: false,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "serial",
      },
    };
    document.tracks[2] = {
      ...document.tracks[2]!,
      audioSource: {
        type: "track",
        trackKey: "track-2",
        mode: "serial",
      },
    };

    const { patch } = createInstrumentEnginePatch(document);

    expect(hasRoute(patch.routes, "track-1.trackGain.main", MASTER_IN)).toBe(
      true,
    );
    expect(
      hasRoute(patch.routes, "track-2.fx4.main", "track-3.filter.main"),
    ).toBe(false);
    expect(hasRoute(patch.routes, "track-3.trackGain.main", MASTER_IN)).toBe(
      true,
    );
  });

  it("compiles missing sources and feedback routes without validation", () => {
    const missingSourceDocument = createDefaultInstrumentDocument();
    useNoteTracks(
      missingSourceDocument,
      missingSourceDocument.tracks.slice(0, 1),
    );
    missingSourceDocument.tracks[0] = {
      ...missingSourceDocument.tracks[0]!,
      audioSource: {
        type: "track",
        trackKey: "missing-track",
        mode: "serial",
      },
    };

    const missingSourceRuntime = createInstrumentEnginePatch(
      missingSourceDocument,
    );

    expect(
      hasRoute(
        missingSourceRuntime.patch.routes,
        "track-1.trackGain.main",
        MASTER_IN,
      ),
    ).toBe(true);

    const feedbackDocument = createDefaultInstrumentDocument();
    useNoteTracks(feedbackDocument, feedbackDocument.tracks.slice(0, 2));
    feedbackDocument.tracks[0] = {
      ...feedbackDocument.tracks[0]!,
      audioSource: {
        type: "track",
        trackKey: "track-2",
        mode: "parallel",
      },
    };
    feedbackDocument.tracks[1] = {
      ...feedbackDocument.tracks[1]!,
      audioSource: {
        type: "track",
        trackKey: "track-1",
        mode: "parallel",
      },
    };

    const feedbackRuntime = createInstrumentEnginePatch(feedbackDocument);

    expect(
      hasRoute(
        feedbackRuntime.patch.routes,
        "track-1.fx4.main",
        "track-2.filter.main",
      ),
    ).toBe(true);
    expect(
      hasRoute(
        feedbackRuntime.patch.routes,
        "track-2.fx4.main",
        "track-1.filter.main",
      ),
    ).toBe(true);
  });

  it("builds a clean master track with no global effect modules", () => {
    const runtime = createInstrumentEnginePatch(
      createDefaultInstrumentDocument(),
    );

    // The former global effect modules are gone.
    expect(
      runtime.patch.modules.some((module) =>
        [
          "instrument.runtime.globalDelay",
          "instrument.runtime.globalReverb",
        ].includes(module.id),
      ),
    ).toBe(false);

    // The default master track is clean: its fx slots are passthrough (Volume),
    // not Delay/Reverb modules.
    const masterFxTypes = runtime.patch.modules
      .filter((module) => /^master\.fx\d\.main$/.test(module.id))
      .map((module) => module.moduleType);
    expect(masterFxTypes).toHaveLength(4);
    expect(masterFxTypes.every((type) => type === ModuleType.Volume)).toBe(
      true,
    );

    // The master track output feeds the engine Master.
    expect(hasRoute(runtime.patch.routes, MASTER_OUT, ENGINE_MASTER)).toBe(
      true,
    );
  });

  it("hydrates saved controller slot values into the initial runtime patch", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];

    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "osc",
      fxChain: ["distortion", "chorus", "delay", "reverb"],
      controllerSlotValues: {
        "source.wave": "square",
        "source.frequency": 220,
        "source.lowGain": false,
        "amp.attack": 0.35,
        "filter.cutoff": 3200,
        "filter.resonance": 7,
        "lfo1.sync": true,
        "fx1.drive": 0.72,
      },
    };

    const runtime = createInstrumentEnginePatch(document);
    const modules = Object.fromEntries(
      runtime.patch.modules.map((module) => [module.id, module]),
    );
    const firstCompiledTrack = runtime.compiledInstrument.tracks[0];

    expect(modules["track-1.source.main"]?.props).toMatchObject({
      wave: "square",
      frequency: 220,
      lowGain: false,
    });
    expect(modules["track-1.amp.envelope"]?.props).toMatchObject({
      attack: 0.35,
    });
    expect(modules["track-1.filter.main"]?.props).toMatchObject({
      cutoff: 3200,
      Q: 7,
    });
    expect(modules["track-1.lfo1.main"]?.props).toMatchObject({
      sync: true,
    });
    expect(modules["track-1.fx1.main"]?.props).toMatchObject({
      drive: 0.72,
    });

    const sourceAmpPage =
      firstCompiledTrack?.compiledTrack.launchControlXL3.resolvedPages.find(
        (page) => page.pageKey === "sourceAmp",
      );
    const waveSlot = sourceAmpPage?.regions[0].slots.find(
      (slot) =>
        slot.kind === "slot" &&
        slot.blockKey === "source" &&
        slot.slotKey === "wave",
    );
    const lowGainSlot = sourceAmpPage?.regions[0].slots.find(
      (slot) =>
        slot.kind === "slot" &&
        slot.blockKey === "source" &&
        slot.slotKey === "lowGain",
    );

    expect(waveSlot).toEqual(
      expect.objectContaining({
        initialValue: "square",
      }),
    );
    expect(lowGainSlot).toEqual(
      expect.objectContaining({
        initialValue: false,
      }),
    );
  });
});
