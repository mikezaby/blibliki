import {
  type IMidiMapperProps,
  type IUpdateModule,
  MidiEvent,
  ModuleType,
  TransportState,
} from "@blibliki/engine";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { createInstrumentControllerSession } from "@/instrumentControllerSession";

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
      loopLength: 2,
      pages: [
        {
          name: "Page 1",
          steps: [
            {
              active: false,
              notes: [{ note: "C3", velocity: 80 }],
              probability: 75,
              microtimeOffset: 10,
              duration: "1/8",
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
    get listenerCount() {
      return listeners.length;
    },
  };
}

describe("createInstrumentControllerSession", () => {
  it("lights page and track navigation leds on startup", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const ledEvents: MidiEvent[] = [];
    const modules = new Map<string, unknown>(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
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

    createInstrumentControllerSession(
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

          return module as never;
        },
        state: TransportState.stopped,
        start: () => Promise.resolve(),
        stop: () => undefined,
        updateModule: (params) => params,
      },
      runtimePatch,
    );

    const getLedValue = (cc: number) =>
      ledEvents.filter((event) => event.cc === cc).at(-1)?.ccValue;

    expect(getLedValue(102)).toBe(127);
    expect(getLedValue(103)).toBe(127);
    expect(getLedValue(106)).toBe(127);
    expect(getLedValue(107)).toBe(127);
  });

  it("re-emits display state when a mapped module prop changes", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
    const displayStates: string[] = [];
    let propsUpdateCallback:
      | ((params: {
          id: string;
          moduleType: ModuleType;
          state?: unknown;
        }) => void)
      | undefined;

    createInstrumentControllerSession(
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
        onPropsUpdate: (callback) => {
          propsUpdateCallback = callback;
        },
      },
      runtimePatch,
      {
        onDisplayStateChange: (displayState) => {
          const firstSlot = displayState.upperBand.slots[0];
          displayStates.push(
            firstSlot.kind === "slot" ? firstSlot.valueText : firstSlot.kind,
          );
        },
      },
    );

    const sourceModule = modules.get("track-1.source.main");
    if (!sourceModule || sourceModule.moduleType !== ModuleType.Oscillator) {
      throw new Error(
        "Expected the seeded runtime to expose source oscillator",
      );
    }

    modules.set(sourceModule.id, {
      ...sourceModule,
      props: {
        ...sourceModule.props,
        wave: "square",
      },
    });

    propsUpdateCallback?.({
      id: sourceModule.id,
      moduleType: ModuleType.Oscillator,
    });

    expect(displayStates).toEqual(["sine", "square"]);
  });

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

    inputDevice.emit(MidiEvent.fromCC(102, 127, 0));

    expect(session.getRuntimePatch().runtime.navigation).toEqual({
      activeTrackIndex: 1,
      activePage: "sourceAmp",
      mode: "performance",
      shiftPressed: false,
      sequencerPageIndex: 0,
      selectedStepIndex: 0,
    });
    const firstUpdate = updateCalls[0];
    expect(firstUpdate?.id).toBe(runtimePatch.runtime.midiMapperId);
    expect(firstUpdate?.moduleType).toBe(ModuleType.MidiMapper);
    if (firstUpdate?.moduleType !== ModuleType.MidiMapper) {
      throw new Error("Expected the first update to target the midi mapper");
    }
    const midiMapperProps = firstUpdate.changes.props as
      | Partial<IMidiMapperProps>
      | undefined;
    expect(midiMapperProps?.activeTrack).toBe(1);
    const lastDisplayState = displayStates[displayStates.length - 1];
    expect(lastDisplayState).toBe("track-2:sourceAmp");
  });

  it("detaches the controller listener on dispose", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const updateCalls: IUpdateModule<ModuleType>[] = [];
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
    );

    expect(inputDevice.listenerCount).toBe(1);

    session.dispose();
    expect(inputDevice.listenerCount).toBe(0);

    inputDevice.emit(MidiEvent.fromCC(102, 127, 0));
    expect(updateCalls).toHaveLength(0);
  });

  it("applies seq edit row-one encoder changes to the active step sequencer", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSequencedInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
    const updateCalls: IUpdateModule<ModuleType>[] = [];

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
          const existingModule = modules.get(params.id);
          if (!existingModule) {
            throw new Error(`Module ${params.id} not found`);
          }

          const nextModule = {
            ...existingModule,
            ...params.changes,
            props: {
              ...existingModule.props,
              ...params.changes.props,
            },
          };
          modules.set(params.id, nextModule);
          return params;
        },
      },
      runtimePatch,
    );

    inputDevice.emit(MidiEvent.fromCC(63, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(106, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(63, 0, 0));
    inputDevice.emit(MidiEvent.fromCC(13, 65, 0));
    inputDevice.emit(MidiEvent.fromCC(14, 63, 0));
    inputDevice.emit(MidiEvent.fromCC(20, 66, 0));

    const stepSequencerUpdate = updateCalls.find(
      (call) => call.moduleType === ModuleType.StepSequencer,
    );
    expect(stepSequencerUpdate).toBeDefined();
    expect(stepSequencerUpdate?.id).toBe("track-1.runtime.stepSequencer");

    const stepSequencerModule = modules.get("track-1.runtime.stepSequencer");
    if (
      !stepSequencerModule ||
      stepSequencerModule.moduleType !== ModuleType.StepSequencer
    ) {
      throw new Error("Expected live step sequencer module");
    }

    const stepSequencerProps = stepSequencerModule.props as {
      activePageNo: number;
      loopLength: number;
      patterns: {
        pages: {
          steps: {
            active: boolean;
            probability: number;
          }[];
        }[];
      }[];
    };

    expect(session.getRuntimePatch().runtime.navigation.mode).toBe("seqEdit");
    expect(stepSequencerProps.activePageNo).toBe(0);
    expect(stepSequencerProps.loopLength).toBe(4);
    expect(stepSequencerProps.patterns[0]?.pages[0]?.steps[0]).toEqual(
      expect.objectContaining({
        active: true,
        probability: 74,
      }),
    );

    expect(session.getDisplayState().globalBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "ON",
      }),
    );
    expect(session.getDisplayState().globalBand.slots[7]).toEqual(
      expect.objectContaining({
        valueText: "4",
      }),
    );
  });

  it("edits seq note-slot velocity and pitch from rows two and three", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSequencedInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
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
          const existingModule = modules.get(params.id);
          if (!existingModule) {
            throw new Error(`Module ${params.id} not found`);
          }

          const nextModule = {
            ...existingModule,
            ...params.changes,
            props: {
              ...existingModule.props,
              ...params.changes.props,
            },
          };
          modules.set(params.id, nextModule);
          return params;
        },
      },
      runtimePatch,
    );

    inputDevice.emit(MidiEvent.fromCC(63, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(106, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(63, 0, 0));
    inputDevice.emit(MidiEvent.fromCC(21, 84, 0));
    inputDevice.emit(MidiEvent.fromCC(29, 65, 0));
    inputDevice.emit(MidiEvent.fromCC(30, 65, 0));
    inputDevice.emit(MidiEvent.fromCC(22, 74, 0));

    const stepSequencerModule = modules.get("track-1.runtime.stepSequencer");
    if (
      !stepSequencerModule ||
      stepSequencerModule.moduleType !== ModuleType.StepSequencer
    ) {
      throw new Error("Expected live step sequencer module");
    }

    const stepSequencerProps = stepSequencerModule.props as {
      patterns: {
        pages: {
          steps: {
            notes: {
              note: string;
              velocity: number;
            }[];
          }[];
        }[];
      }[];
    };

    expect(stepSequencerProps.patterns[0]?.pages[0]?.steps[0]?.notes).toEqual([
      {
        note: "C#3",
        velocity: 100,
      },
      {
        note: "C3",
        velocity: 110,
      },
    ]);
    expect(session.getDisplayState().upperBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "100",
      }),
    );
    expect(session.getDisplayState().upperBand.slots[1]).toEqual(
      expect.objectContaining({
        valueText: "110",
      }),
    );
    expect(session.getDisplayState().lowerBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "C#3",
      }),
    );
    expect(session.getDisplayState().lowerBand.slots[1]).toEqual(
      expect.objectContaining({
        valueText: "C3",
      }),
    );
  });

  it("turns a note slot off when its pitch encoder reaches OFF", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSequencedInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
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
          const existingModule = modules.get(params.id);
          if (!existingModule) {
            throw new Error(`Module ${params.id} not found`);
          }

          const nextModule = {
            ...existingModule,
            ...params.changes,
            props: {
              ...existingModule.props,
              ...params.changes.props,
            },
          };
          modules.set(params.id, nextModule);
          return params;
        },
      },
      runtimePatch,
    );

    inputDevice.emit(MidiEvent.fromCC(63, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(106, 127, 0));
    inputDevice.emit(MidiEvent.fromCC(63, 0, 0));
    inputDevice.emit(MidiEvent.fromCC(29, 0, 0));

    const stepSequencerModule = modules.get("track-1.runtime.stepSequencer");
    if (
      !stepSequencerModule ||
      stepSequencerModule.moduleType !== ModuleType.StepSequencer
    ) {
      throw new Error("Expected live step sequencer module");
    }

    const stepSequencerProps = stepSequencerModule.props as {
      patterns: {
        pages: {
          steps: {
            active: boolean;
            notes: {
              note: string;
              velocity: number;
            }[];
          }[];
        }[];
      }[];
    };

    expect(stepSequencerProps.patterns[0]?.pages[0]?.steps[0]).toEqual(
      expect.objectContaining({
        active: false,
        notes: [],
      }),
    );
    expect(session.getDisplayState().globalBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "OFF",
      }),
    );
    expect(session.getDisplayState().upperBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "--",
        inactive: true,
      }),
    );
    expect(session.getDisplayState().lowerBand.slots[0]).toEqual(
      expect.objectContaining({
        valueText: "--",
        inactive: true,
      }),
    );
  });

  it("refreshes display state from external transport state changes instead of handling play directly", async () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
    let transportState = TransportState.stopped;
    let startCalls = 0;
    let stopCalls = 0;
    let transportStateCallback:
      | ((state: TransportState, actionAt: number) => void)
      | undefined;
    const displayStates: TransportState[] = [];

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
        get state() {
          return transportState;
        },
        start: () => {
          startCalls += 1;
          transportState = TransportState.playing;
          return Promise.resolve();
        },
        stop: () => {
          stopCalls += 1;
          transportState = TransportState.stopped;
        },
        transport: {
          addPropertyChangeCallback: (_property, callback) => {
            transportStateCallback = callback;
          },
        },
        updateModule: (params) => {
          return params;
        },
      },
      runtimePatch,
      {
        onDisplayStateChange: (displayState) => {
          displayStates.push(displayState.header.transportState);
        },
      },
    );

    inputDevice.emit(MidiEvent.fromCC(116, 127, 0));
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });

    expect(startCalls).toBe(0);
    expect(stopCalls).toBe(0);
    expect(displayStates).toEqual([TransportState.stopped]);

    transportState = TransportState.playing;
    transportStateCallback?.(TransportState.playing, 0);

    expect(startCalls).toBe(0);
    expect(stopCalls).toBe(0);
    expect(displayStates).toEqual([
      TransportState.stopped,
      TransportState.playing,
    ]);
    expect(session.getDisplayState().header.transportState).toBe(
      TransportState.playing,
    );
  });

  it("ignores record press and leaves playback state unchanged", async () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSeededInstrumentDocument(),
    );
    const inputDevice = createControllerInputDevice();
    const modules = new Map(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
    let transportState = TransportState.playing;
    let startCalls = 0;
    let stopCalls = 0;

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
        get state() {
          return transportState;
        },
        start: () => {
          startCalls += 1;
          transportState = TransportState.playing;
          return Promise.resolve();
        },
        stop: () => {
          stopCalls += 1;
          transportState = TransportState.stopped;
        },
        updateModule: (params) => {
          return params;
        },
      },
      runtimePatch,
    );

    inputDevice.emit(MidiEvent.fromCC(118, 127, 0));
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });

    expect(startCalls).toBe(0);
    expect(stopCalls).toBe(0);
    expect(session.getDisplayState().header.transportState).toBe(
      TransportState.playing,
    );
  });

  it("syncs seq edit step-button LEDs for selected, programmed, and playhead states", () => {
    const runtimePatch = createInstrumentEnginePatch(
      createSequencedInstrumentDocument(),
      {
        navigation: {
          activeTrackIndex: 0,
          activePage: "sourceAmp",
          mode: "seqEdit",
          shiftPressed: false,
          sequencerPageIndex: 0,
          selectedStepIndex: 0,
        },
      },
    );
    const inputDevice = createControllerInputDevice();
    const ledEvents: MidiEvent[] = [];
    const modules = new Map<string, unknown>(
      runtimePatch.patch.modules.map((module) => [module.id, module]),
    );
    let onPropsUpdate:
      | ((params: {
          id: string;
          moduleType: ModuleType;
          state?: unknown;
        }) => void)
      | undefined;

    const controllerOutputId = runtimePatch.runtime.controllerOutputId;
    if (!controllerOutputId) {
      throw new Error("Expected controller output module in runtime patch");
    }

    const liveControllerOutput = {
      ...(modules.get(controllerOutputId) ?? {}),
      moduleType: ModuleType.MidiOutput,
      onMidiEvent: (event: MidiEvent) => {
        ledEvents.push(event);
      },
    };
    modules.set(controllerOutputId, liveControllerOutput);

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

          return module as never;
        },
        state: TransportState.stopped,
        start: () => Promise.resolve(),
        stop: () => undefined,
        onPropsUpdate: (callback) => {
          onPropsUpdate = callback;
        },
        updateModule: (params) => {
          return params;
        },
      },
      runtimePatch,
    );

    const getLedValue = (cc: number) =>
      ledEvents.filter((event) => event.cc === cc).at(-1)?.ccValue;

    expect(getLedValue(37)).toBe(127);
    expect(getLedValue(38)).toBe(96);
    expect(getLedValue(39)).toBe(0);

    inputDevice.emit(MidiEvent.fromCC(38, 127, 0));

    expect(session.getRuntimePatch().runtime.navigation.selectedStepIndex).toBe(
      1,
    );
    expect(getLedValue(38)).toBe(96);

    liveStepSequencer.state = {
      currentStep: 5,
    };
    onPropsUpdate?.({
      id: stepSequencerId,
      moduleType: ModuleType.StepSequencer,
      state: liveStepSequencer.state,
    });

    inputDevice.emit(MidiEvent.fromCC(45, 127, 0));

    expect(session.getRuntimePatch().runtime.navigation.selectedStepIndex).toBe(
      8,
    );
    expect(getLedValue(37)).toBe(64);
    expect(getLedValue(42)).toBe(96);
    expect(getLedValue(45)).toBe(127);
  });
});
