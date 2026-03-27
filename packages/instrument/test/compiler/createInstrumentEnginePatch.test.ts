import type { IMidiMapperProps } from "@blibliki/engine";
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

describe("createInstrumentEnginePatch", () => {
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
    expect(runtime.runtime).toEqual({
      masterId: "instrument.runtime.master",
      transportControlId: "instrument.runtime.transportControl",
      masterFilterId: "instrument.runtime.masterFilter",
      globalDelayId: "instrument.runtime.globalDelay",
      globalReverbId: "instrument.runtime.globalReverb",
      masterVolumeId: "instrument.runtime.masterVolume",
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
            id === "instrument.runtime.masterFilter" ||
            id === "instrument.runtime.globalDelay" ||
            id === "instrument.runtime.globalReverb" ||
            id === "instrument.runtime.masterVolume" ||
            id === "instrument.runtime.master" ||
            id === "track-1.runtime.midiChannelFilter" ||
            id === "track-1.runtime.voiceScheduler" ||
            id === "track-1.source.main" ||
            id === "track-8.fx4.main" ||
            id === "track-8.trackGain.main",
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
        id: "instrument.runtime.globalDelay",
        moduleType: ModuleType.Delay,
      },
      {
        id: "instrument.runtime.globalReverb",
        moduleType: ModuleType.Reverb,
      },
      {
        id: "instrument.runtime.master",
        moduleType: ModuleType.Master,
      },
      {
        id: "instrument.runtime.masterFilter",
        moduleType: ModuleType.Filter,
      },
      {
        id: "instrument.runtime.masterVolume",
        moduleType: ModuleType.Gain,
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
        id: "track-8.fx4.main",
        moduleType: ModuleType.Reverb,
      },
      {
        id: "track-8.trackGain.main",
        moduleType: ModuleType.Gain,
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

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-8.trackGain.main" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.masterFilter" &&
          destination.ioName === "in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.masterFilter" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.globalDelay" &&
          destination.ioName === "in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.globalDelay" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.globalReverb" &&
          destination.ioName === "in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.globalReverb" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.masterVolume" &&
          destination.ioName === "in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "instrument.runtime.masterVolume" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.master" &&
          destination.ioName === "in",
      ),
    ).toBe(true);

    const midiMapper = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.midiMapperId,
    );
    expect(midiMapper).toBeDefined();
    if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;

    expect(midiMapperProps.tracks).toHaveLength(8);
    expect(midiMapperProps.activeTrack).toBe(0);
    expect(midiMapperProps.tracks[0]?.name).toBe("track-1");
    expect(midiMapperProps.tracks[0]?.mappings[0]).toEqual(
      expect.objectContaining({
        moduleId: "track-1.source.main",
      }),
    );
    expect(midiMapperProps.tracks[7]?.name).toBe("track-8");
    expect(midiMapperProps.globalMappings).toEqual([
      expect.objectContaining({
        cc: 13,
        moduleId: "instrument.runtime.transportControl",
        moduleType: ModuleType.TransportControl,
        propName: "bpm",
      }),
      expect.objectContaining({
        cc: 14,
        moduleId: "instrument.runtime.transportControl",
        moduleType: ModuleType.TransportControl,
        propName: "swing",
      }),
      expect.objectContaining({
        cc: 15,
        moduleId: "instrument.runtime.masterFilter",
        moduleType: ModuleType.Filter,
        propName: "cutoff",
      }),
      expect.objectContaining({
        cc: 16,
        moduleId: "instrument.runtime.masterFilter",
        moduleType: ModuleType.Filter,
        propName: "Q",
      }),
      expect.objectContaining({
        cc: 17,
        moduleId: "instrument.runtime.globalReverb",
        moduleType: ModuleType.Reverb,
        propName: "mix",
      }),
      expect.objectContaining({
        cc: 18,
        moduleId: "instrument.runtime.globalDelay",
        moduleType: ModuleType.Delay,
        propName: "mix",
      }),
      expect.objectContaining({
        cc: 20,
        moduleId: "instrument.runtime.masterVolume",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 5,
        moduleId: "track-1.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 6,
        moduleId: "track-2.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 7,
        moduleId: "track-3.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 8,
        moduleId: "track-4.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 9,
        moduleId: "track-5.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 10,
        moduleId: "track-6.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 11,
        moduleId: "track-7.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
      }),
      expect.objectContaining({
        cc: 12,
        moduleId: "track-8.trackGain.main",
        moduleType: ModuleType.Gain,
        propName: "gain",
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
      enabled: index === 1 || index === 5,
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
      ["track-2", "track-6"],
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
    if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected instrument midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;

    expect(midiMapperProps.tracks).toHaveLength(2);
    expect(midiMapperProps.tracks.map((track) => track.name)).toEqual([
      "track-2",
      "track-6",
    ]);
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
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.trackGain.main" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.masterFilter" &&
          destination.ioName === "in",
      ),
    ).toBe(true);

    expect(
      runtime.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.lfo1.main" &&
          source.ioName === "out" &&
          destination.moduleId === "instrument.runtime.masterFilter" &&
          destination.ioName === "in",
      ),
    ).toBe(false);
  });

  it("starts the global delay and reverb runtime modules dry", () => {
    const runtime = createInstrumentEnginePatch(
      createDefaultInstrumentDocument(),
    );

    const globalDelay = runtime.patch.modules.find(
      (module) => module.id === "instrument.runtime.globalDelay",
    );
    const globalReverb = runtime.patch.modules.find(
      (module) => module.id === "instrument.runtime.globalReverb",
    );

    expect(globalDelay?.props).toMatchObject({ mix: 0 });
    expect(globalReverb?.props).toMatchObject({ mix: 0 });
  });
});
