import { ModuleType, TransportState } from "@blibliki/engine";
import { createDefaultInstrumentDocument } from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import {
  createInstrumentSession,
  startInstrumentSession,
} from "@/instrumentSession";

describe("createInstrumentSession", () => {
  it("adds an optional drone source to any document track and fans out to multi-plug source inputs", () => {
    const document = createDefaultInstrumentDocument();
    const secondTrack = document.tracks[1];
    if (!secondTrack) {
      throw new Error("Expected default instrument to include a second track");
    }

    document.tracks[1] = {
      ...secondTrack,
      sourceProfileId: "threeOsc",
    };

    const session = createInstrumentSession(document, {
      noteInput: false,
      controllerInput: false,
      controllerOutput: false,
      drone: {
        trackKey: "track-2",
        note: "E3",
      },
    });

    expect(session.runtime.noteInputId).toBeUndefined();
    expect(session.runtime.controllerInputId).toBeUndefined();
    expect(session.runtime.controllerOutputId).toBeUndefined();
    expect(session.runtime.droneMidiId).toBe("track-2.runtime.droneMidi");
    expect(session.runtime.droneTrackKey).toBe("track-2");
    expect(session.runtime.droneNote).toBe("E3");

    const droneMidi = session.patch.modules.find(
      (module) => module.id === session.runtime.droneMidiId,
    );
    expect(droneMidi).toEqual(
      expect.objectContaining({
        id: "track-2.runtime.droneMidi",
        moduleType: ModuleType.VirtualMidi,
      }),
    );
    expect(
      session.patch.modules.some(
        (module) =>
          module.id === "track-2.runtime.voiceScheduler" &&
          module.moduleType === ModuleType.VoiceScheduler,
      ),
    ).toBe(true);

    expect(
      session.patch.routes.map(({ source, destination }) => ({
        source,
        destination,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          source: {
            moduleId: "track-2.runtime.droneMidi",
            ioName: "midi out",
          },
          destination: {
            moduleId: "track-2.runtime.voiceScheduler",
            ioName: "midi in",
          },
        },
        {
          source: {
            moduleId: "track-2.runtime.voiceScheduler",
            ioName: "midi out",
          },
          destination: {
            moduleId: "track-2.source.osc1",
            ioName: "midi in",
          },
        },
        {
          source: {
            moduleId: "track-2.runtime.voiceScheduler",
            ioName: "midi out",
          },
          destination: {
            moduleId: "track-2.source.osc2",
            ioName: "midi in",
          },
        },
        {
          source: {
            moduleId: "track-2.runtime.voiceScheduler",
            ioName: "midi out",
          },
          destination: {
            moduleId: "track-2.source.osc3",
            ioName: "midi in",
          },
        },
      ]),
    );
  });

  it("does not start the engine automatically, emits the drone note on, and sends note off on dispose", async () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "osc",
    };

    let startCalls = 0;
    let stopCalls = 0;
    let disposeCalls = 0;
    const triggerCalls: {
      moduleId: string;
      note: string;
      type: "noteOn" | "noteOff";
    }[] = [];

    const started = await startInstrumentSession(document, {
      noteInput: false,
      controllerInput: false,
      controllerOutput: false,
      drone: {
        trackKey: "track-1",
        note: "C3",
      },
      engineLoader: (patch) => {
        const modules = new Map(
          patch.modules.map((module) => [module.id, module]),
        );

        return Promise.resolve({
          state: TransportState.stopped,
          start: () => {
            startCalls += 1;
            return Promise.resolve();
          },
          stop: () => {
            stopCalls += 1;
          },
          dispose: () => {
            disposeCalls += 1;
          },
          triggerVirtualMidi: (
            moduleId: string,
            note: string,
            type: "noteOn" | "noteOff",
          ) => {
            triggerCalls.push({ moduleId, note, type });
          },
          findMidiInputDeviceByFuzzyName: () => null,
          findModule: (id: string) => {
            const module = modules.get(id);
            if (!module) {
              throw new Error(`Module ${id} not found`);
            }

            return module;
          },
          updateModule: (params) => params,
          onPropsUpdate: () => undefined,
        });
      },
    });

    expect(startCalls).toBe(0);
    expect(stopCalls).toBe(0);
    expect(triggerCalls).toEqual([
      {
        moduleId: "track-1.runtime.droneMidi",
        note: "C3",
        type: "noteOn",
      },
    ]);
    expect(started.controllerSession.getDisplayState().header.trackName).toBe(
      "track-1",
    );

    started.dispose();

    expect(triggerCalls).toEqual([
      {
        moduleId: "track-1.runtime.droneMidi",
        note: "C3",
        type: "noteOn",
      },
      {
        moduleId: "track-1.runtime.droneMidi",
        note: "C3",
        type: "noteOff",
      },
    ]);
    expect(disposeCalls).toBe(1);
  });
});
