import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createTrackEnginePatch } from "@/compiler/createTrackEnginePatch";
import Track from "@/tracks/Track";

describe("createTrackEnginePatch", () => {
  it("should wrap the compiled track with runtime modules and routes for playback and controller mapping", () => {
    const runtime = createTrackEnginePatch(new Track("track-1"));

    expect(runtime.compiledTrack.key).toBe("track-1");
    expect(runtime.runtime).toEqual({
      masterId: "track-1.runtime.master",
      midiMapperId: "track-1.runtime.midiMapper",
      noteInputId: "track-1.runtime.noteInput",
      controllerInputId: "track-1.runtime.controllerInput",
      controllerOutputId: "track-1.runtime.controllerOutput",
    });

    expect(
      runtime.patch.modules
        .map(({ id, moduleType }) => ({ id, moduleType }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ).toEqual([
      { id: "amp.envelope", moduleType: ModuleType.Envelope },
      { id: "amp.gain", moduleType: ModuleType.Gain },
      { id: "filter.constant", moduleType: ModuleType.Constant },
      { id: "filter.envelope", moduleType: ModuleType.Envelope },
      { id: "filter.main", moduleType: ModuleType.Filter },
      { id: "fx1.main", moduleType: ModuleType.Distortion },
      { id: "fx2.main", moduleType: ModuleType.Chorus },
      { id: "fx3.main", moduleType: ModuleType.Delay },
      { id: "fx4.main", moduleType: ModuleType.Reverb },
      { id: "lfo1.main", moduleType: ModuleType.LFO },
      { id: "source.main", moduleType: ModuleType.Oscillator },
      {
        id: "track-1.runtime.controllerInput",
        moduleType: ModuleType.MidiInput,
      },
      {
        id: "track-1.runtime.controllerOutput",
        moduleType: ModuleType.MidiOutput,
      },
      { id: "track-1.runtime.master", moduleType: ModuleType.Master },
      {
        id: "track-1.runtime.midiChannelFilter",
        moduleType: ModuleType.MidiChannelFilter,
      },
      {
        id: "track-1.runtime.midiMapper",
        moduleType: ModuleType.MidiMapper,
      },
      { id: "track-1.runtime.noteInput", moduleType: ModuleType.MidiInput },
      {
        id: "track-1.runtime.voiceScheduler",
        moduleType: ModuleType.VoiceScheduler,
      },
      { id: "trackGain.main", moduleType: ModuleType.Gain },
    ]);

    expect(
      runtime.patch.routes.map(({ source, destination }) => ({
        source,
        destination,
      })),
    ).toEqual([
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
      {
        source: { moduleId: "fx1.main", ioName: "out" },
        destination: { moduleId: "fx2.main", ioName: "in" },
      },
      {
        source: { moduleId: "fx2.main", ioName: "out" },
        destination: { moduleId: "fx3.main", ioName: "in" },
      },
      {
        source: { moduleId: "fx3.main", ioName: "out" },
        destination: { moduleId: "fx4.main", ioName: "in" },
      },
      {
        source: { moduleId: "fx4.main", ioName: "out" },
        destination: { moduleId: "trackGain.main", ioName: "in" },
      },
      {
        source: { moduleId: "track-1.runtime.noteInput", ioName: "midi out" },
        destination: {
          moduleId: "track-1.runtime.midiChannelFilter",
          ioName: "midi in",
        },
      },
      {
        source: {
          moduleId: "track-1.runtime.midiChannelFilter",
          ioName: "midi out",
        },
        destination: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi in",
        },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "source.main", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "amp.envelope", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "filter.main", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "filter.envelope", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.controllerInput",
          ioName: "midi out",
        },
        destination: {
          moduleId: "track-1.runtime.midiMapper",
          ioName: "midi in",
        },
      },
      {
        source: {
          moduleId: "track-1.runtime.midiMapper",
          ioName: "midi out",
        },
        destination: {
          moduleId: "track-1.runtime.controllerOutput",
          ioName: "midi in",
        },
      },
      {
        source: { moduleId: "trackGain.main", ioName: "out" },
        destination: { moduleId: "track-1.runtime.master", ioName: "in" },
      },
    ]);

    const noteInput = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.noteInputId,
    );
    expect(noteInput).toEqual(
      expect.objectContaining({
        name: "Track Note Input",
        moduleType: ModuleType.MidiInput,
      }),
    );
    expect(noteInput?.props).toMatchObject({
      selectedId: "computer_keyboard",
      selectedName: "Computer Keyboard",
    });

    const controllerInput = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.controllerInputId,
    );
    expect(controllerInput).toEqual(
      expect.objectContaining({
        name: "Track Controller Input",
        moduleType: ModuleType.MidiInput,
      }),
    );
    expect(controllerInput?.props).toMatchObject({
      selectedId: null,
      selectedName: "LCXL3 DAW In",
    });

    const controllerOutput = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.controllerOutputId,
    );
    expect(controllerOutput).toEqual(
      expect.objectContaining({
        name: "Track Controller Output",
        moduleType: ModuleType.MidiOutput,
      }),
    );
    expect(controllerOutput?.props).toMatchObject({
      selectedId: null,
      selectedName: "LCXL3 DAW Out",
    });

    const midiMapper = runtime.patch.modules.find(
      (module) => module.id === runtime.runtime.midiMapperId,
    );
    expect(midiMapper).toBeDefined();
    if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected Track Midi Mapper module");
    }

    expect(midiMapper.name).toBe("Track Midi Mapper");
    expect(midiMapper.props).toEqual(
      expect.objectContaining({
        activeTrack: 0,
        globalMappings: [],
        tracks: runtime.compiledTrack.launchControlXL3.midiMapper.tracks,
      }),
    );
  });
});
