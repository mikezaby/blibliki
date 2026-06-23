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

function createSequencedInstrumentDocument() {
  const document = createSeededInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    noteSource: "stepSequencer",
    sequencer: {
      ...firstTrack.sequencer,
      pages: [
        {
          name: "Page 1",
          steps: [
            {
              active: true,
              notes: [{ note: "C3", velocity: 80 }],
              probability: 100,
              microtimeOffset: 0,
              duration: "1/16",
            },
            ...Array.from({ length: 15 }, () => ({
              active: false,
              notes: [],
              probability: 100,
              microtimeOffset: 0,
              duration: "1/16" as const,
            })),
          ],
        },
        ...firstTrack.sequencer.pages.slice(1),
      ],
    },
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

  it("syncs playhead LEDs from immediate sequencer state updates", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSequencedInstrumentDocument(),
      {
        navigation: {
          mode: "seqEdit",
          selectedStepIndex: 0,
        },
      },
    );
    const inputDevice = createControllerInputDevice();
    const ledEvents: MidiEvent[] = [];
    const modules = new Map<string, unknown>(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
    type StateUpdate = {
      id: string;
      moduleType: ModuleType;
      state?: unknown;
    };
    let stateUpdateCallback: ((params: StateUpdate) => void) | undefined;
    let removedStateUpdateCallback: ((params: StateUpdate) => void) | undefined;

    const controllerOutputId = runtimePatch.runtime.controllerOutputId;
    if (!controllerOutputId) {
      throw new Error("Expected controller output module in runtime patch");
    }
    modules.set(controllerOutputId, {
      ...(modules.get(controllerOutputId) ?? {}),
      moduleType: ModuleType.MidiOutput,
      onMidiEvent: (event: MidiEvent) => {
        ledEvents.push(event);
      },
    });

    const stepSequencerId = runtimePatch.runtime.stepSequencerIds["track-1"];
    if (!stepSequencerId) {
      throw new Error("Expected sequencer id for track-1");
    }
    const liveStepSequencer = {
      ...(modules.get(stepSequencerId) ?? {}),
      moduleType: ModuleType.StepSequencer,
      state: {
        currentStep: 1,
      },
    };
    modules.set(stepSequencerId, liveStepSequencer);

    const engine = {
      findMidiInputDeviceByFuzzyName: () => ({
        device: inputDevice,
        score: 1,
      }),
      findModule: (id: string) => {
        const module = modules.get(id);
        if (!module) {
          throw new Error(`Module ${id} not found`);
        }

        return module;
      },
      state: TransportState.playing,
      start: () => Promise.resolve(),
      stop: () => undefined,
      onStateUpdate: (callback: (params: StateUpdate) => void) => {
        stateUpdateCallback = callback;
      },
      removeStateUpdateCallback: (callback: (params: StateUpdate) => void) => {
        removedStateUpdateCallback = callback;
      },
      updateModule: <T extends ModuleType>(params: IUpdateModule<T>) => params,
    };

    const session = new InstrumentSession(engine, runtimePatch);

    expect(stateUpdateCallback).toBeTypeOf("function");

    liveStepSequencer.state = {
      currentStep: 5,
    };
    stateUpdateCallback?.({
      id: stepSequencerId,
      moduleType: ModuleType.StepSequencer,
      state: liveStepSequencer.state,
    });

    const getLedValue = (cc: number) =>
      ledEvents.filter((event) => event.cc === cc).at(-1)?.ccValue;

    expect(getLedValue(42)).toBe(96);

    session.dispose();

    expect(removedStateUpdateCallback).toBe(stateUpdateCallback);

    const ledEventCount = ledEvents.length;
    liveStepSequencer.state = {
      currentStep: 6,
    };
    stateUpdateCallback?.({
      id: stepSequencerId,
      moduleType: ModuleType.StepSequencer,
      state: liveStepSequencer.state,
    });

    expect(ledEvents).toHaveLength(ledEventCount);
  });
});
