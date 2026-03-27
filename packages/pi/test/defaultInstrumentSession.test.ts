import { type IMidiMapperProps, ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createDefaultInstrumentSession } from "@/defaultInstrument";

describe("createDefaultInstrumentSession", () => {
  it("should build a playable aggregate instrument patch with a drone note source on the first track", () => {
    const session = createDefaultInstrumentSession();

    expect(session.runtime).toEqual({
      masterId: "instrument.runtime.master",
      transportControlId: "instrument.runtime.transportControl",
      masterFilterId: "instrument.runtime.masterFilter",
      globalDelayId: "instrument.runtime.globalDelay",
      globalReverbId: "instrument.runtime.globalReverb",
      masterVolumeId: "instrument.runtime.masterVolume",
      midiMapperId: "instrument.runtime.midiMapper",
      noteInputId: undefined,
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
      droneMidiId: "track-1.runtime.droneMidi",
      droneTrackKey: "track-1",
      droneNote: "C3",
    });

    const droneMidi = session.patch.modules.find(
      (module) => module.id === session.runtime.droneMidiId,
    );
    expect(droneMidi).toEqual(
      expect.objectContaining({
        id: "track-1.runtime.droneMidi",
        name: "Instrument Drone",
        moduleType: ModuleType.VirtualMidi,
        props: { activeNotes: [] },
      }),
    );

    expect(
      session.patch.modules.some(
        (module) => module.id === session.runtime.noteInputId,
      ),
    ).toBe(false);

    expect(
      session.patch.routes.map(({ source, destination }) => ({
        source,
        destination,
      })),
    ).toContainEqual({
      source: {
        moduleId: "track-1.runtime.droneMidi",
        ioName: "midi out",
      },
      destination: {
        moduleId: "track-1.runtime.voiceScheduler",
        ioName: "midi in",
      },
    });

    expect(
      session.patch.modules.some(
        (module) =>
          module.id === "track-1.runtime.voiceScheduler" &&
          module.moduleType === ModuleType.VoiceScheduler,
      ),
    ).toBe(true);

    const midiMapper = session.patch.modules.find(
      (module) => module.id === session.runtime.midiMapperId,
    );
    expect(midiMapper).toBeDefined();
    if (!midiMapper || midiMapper.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected midi mapper module");
    }

    const midiMapperProps = midiMapper.props as IMidiMapperProps;
    expect(midiMapperProps.tracks).toHaveLength(8);
    expect(midiMapperProps.activeTrack).toBe(0);
    expect(midiMapperProps.tracks[0]?.name).toBe("track-1");
    expect(midiMapperProps.tracks[7]?.name).toBe("track-8");
  });
});
