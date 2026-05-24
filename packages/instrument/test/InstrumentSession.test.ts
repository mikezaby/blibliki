import {
  type IMidiMapperProps,
  type IUpdateModule,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { InstrumentSession } from "@/InstrumentSession";
import type { InstrumentPersistenceAction } from "@/InstrumentSessionPersistence";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";

function createSeededInstrumentDocument() {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
  };

  return document;
}

function createControllerInputDevice() {
  const listeners: ((event: MidiEvent) => void)[] = [];

  return {
    name: "LCXL3 DAW In",
    addEventListener(callback: (event: MidiEvent) => void) {
      listeners.push(callback);
    },
    removeEventListener(callback: (event: MidiEvent) => void) {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },
    emit(event: MidiEvent) {
      listeners.forEach((listener) => {
        listener(event);
      });
    },
  };
}

describe("InstrumentSession", () => {
  it("owns controller input lifecycle and live midi mapper updates", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const updateCalls: IUpdateModule<ModuleType>[] = [];
    const displayStates: string[] = [];
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );

    const session = new InstrumentSession(
      {
        findMidiInputDeviceByFuzzyName: () => ({
          device: inputDevice,
          score: 1,
        }),
        findModule: (id) => {
          const module = modules.get(id);
          if (!module) {
            throw new Error(`Module ${id} not found`);
          }

          return module;
        },
        state: TransportState.stopped,
        start: () => Promise.resolve(),
        stop: () => undefined,
        updateModule: (params) => {
          updateCalls.push(params);
          return params;
        },
      },
      runtimePatch,
      {
        onDisplayStateChange: (displayState) => {
          displayStates.push(
            `${displayState.header.trackName}:${displayState.header.pageKey}`,
          );
        },
      },
    );

    inputDevice.emit(MidiEvent.fromCC(106, 127, 0));

    expect(session.getRuntimePatch().runtime.navigation.activePage).toBe(
      "filterMod",
    );
    expect(displayStates).toEqual(["track-1:sourceAmp", "track-1:filterMod"]);

    const lastUpdate = updateCalls.at(-1);
    expect(lastUpdate?.id).toBe(runtimePatch.runtime.midiMapperId);
    expect(lastUpdate?.moduleType).toBe(ModuleType.MidiMapper);
    expect(
      (lastUpdate?.changes.props as Partial<IMidiMapperProps> | undefined)
        ?.activeTrack,
    ).toBe(0);

    session.dispose();
    inputDevice.emit(MidiEvent.fromCC(106, 127, 0));

    expect(session.getRuntimePatch().runtime.navigation.activePage).toBe(
      "filterMod",
    );
  });

  it("requires a repeated matching persistence command before running it", async () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const actions: InstrumentPersistenceAction[] = [];
    const notices: string[] = [];
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );

    new InstrumentSession(
      {
        findMidiInputDeviceByFuzzyName: () => ({
          device: inputDevice,
          score: 1,
        }),
        findModule: (id) => {
          const module = modules.get(id);
          if (!module) {
            throw new Error(`Module ${id} not found`);
          }

          return module;
        },
        state: TransportState.stopped,
        start: () => Promise.resolve(),
        stop: () => undefined,
        updateModule: (params) => params,
      },
      runtimePatch,
      {
        onDisplayStateChange: (displayState) => {
          if (displayState.notice) {
            notices.push(displayState.notice.title);
          }
        },
        onPersistenceAction: (action) => {
          actions.push(action);
          return {
            title: "SAVED",
            tone: "success",
          };
        },
      },
    );

    inputDevice.emit(MidiEvent.fromCC(63, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(102, 127, 0));

    expect(actions).toEqual([]);
    expect(notices.at(-1)).toBe("SAVE TO CLOUD?");

    inputDevice.emit(MidiEvent.fromCC(102, 127, 0));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(actions).toEqual(["saveDraft"]);
    expect(notices.slice(-3)).toEqual(["SAVE TO CLOUD?", "SAVING...", "SAVED"]);
  });
});
