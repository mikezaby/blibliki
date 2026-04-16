import {
  type IUpdateModule,
  type IMidiMapperProps,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import { createInstrumentControllerSession } from "@/runtime/instrumentControllerSession";

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

describe("createInstrumentControllerSession", () => {
  it("applies navigation button presses to the live midi mapper state", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const updateCalls: IUpdateModule<ModuleType>[] = [];
    const displayStates: string[] = [];
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );

    const session = createInstrumentControllerSession(
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

    expect(session.getRuntimePatch().runtime.navigation).toEqual({
      activeTrackIndex: 0,
      activePage: "filterMod",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });
    expect(displayStates).toEqual(["track-1:sourceAmp", "track-1:filterMod"]);
    const lastUpdate = updateCalls.at(-1);
    expect(lastUpdate).toBeDefined();
    expect(lastUpdate?.id).toBe(runtimePatch.runtime.midiMapperId);
    expect(lastUpdate?.moduleType).toBe(ModuleType.MidiMapper);
    expect(
      (lastUpdate?.changes.props as Partial<IMidiMapperProps> | undefined)
        ?.activeTrack,
    ).toBe(0);
  });
});
