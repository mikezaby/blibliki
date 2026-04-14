import type { IUpdateModule, ModuleTypeToStateMapping } from "@blibliki/engine";
import {
  Engine,
  type IEngineSerialize,
  type IModule,
  ModuleType,
} from "@blibliki/engine";
import {
  createTrackEnginePatch,
  createTrackFromDocument,
  scopeTrackIO,
  type BlockPlug,
  type InstrumentDocument,
  type InstrumentTrackDocument,
} from "@blibliki/instrument";
import { Context } from "@blibliki/utils";
import { fork } from "node:child_process";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  InstrumentSession,
  InstrumentSessionEngine,
} from "@/instrumentSession";
import {
  createPcmExportNode,
  createPcmImportNode,
  loadMultiprocessAudioBridgeProcessors,
  type PcmChunkMessage,
  type PcmImportNode,
} from "@/multiprocessAudioBridge";

const DEFAULT_TRACK_VOICES = 8;
const MIN_SWING = 0;
const MAX_SWING = 1;
const TRANSPORT_SWING_MIN = 0.5;
const TRANSPORT_SWING_MAX = 0.75;
const EXPORT_MONITOR_ID = "__multiprocess.exportInspector";

export type MultiprocessTrackWorkerMessage =
  | {
      type: "init";
      spec: MultiprocessTrackWorkerSpec;
    }
  | {
      type: "updateModule";
      update: {
        id: string;
        moduleType: ModuleType;
        changes: {
          name?: string;
          props?: Record<string, unknown>;
          voices?: number;
        };
      };
    }
  | {
      type: "setTransport";
      bpm: number;
      swing: number;
    }
  | {
      type: "start";
    }
  | {
      type: "stop";
    }
  | {
      type: "triggerVirtualMidi";
      moduleId: string;
      note: string;
      midiType: "noteOn" | "noteOff";
    }
  | {
      type: "shutdown";
    };

export type MultiprocessTrackWorkerHandle = {
  trackKey: string;
  send: (message: MultiprocessTrackWorkerMessage) => boolean;
};

export type SpawnedMultiprocessTrackWorkerHandle =
  MultiprocessTrackWorkerHandle & {
    on: (event: string, handler: (...args: unknown[]) => void) => unknown;
    pid?: number;
    kill?: (signal?: NodeJS.Signals | number) => boolean;
  };

export type MultiprocessTrackWorkerEvent =
  | {
      type: "ready";
      trackKey: string;
      pid: number;
    }
  | {
      type: "error";
      trackKey?: string;
      message: string;
    }
  | ({
      type: "pcm-chunk";
      trackKey: string;
    } & PcmChunkMessage);

export type MultiprocessTrackWorkerSpec = {
  trackKey: string;
  patch: IEngineSerialize;
  parentAudioSourcePlugs: BlockPlug[];
  workerAudioSourcePlugs: BlockPlug[];
  bpm: number;
  swing: number;
};

export type CreateMultiprocessInstrumentEngineOptions = {
  trackVoices?: number;
  log?: (message: string) => void;
  spawnWorker?: (
    spec: MultiprocessTrackWorkerSpec,
  ) => SpawnedMultiprocessTrackWorkerHandle;
  loadParentEngine?: (patch: IEngineSerialize) => Promise<Engine>;
};

type MidiPortSelection = {
  selectedId?: string | null;
  selectedName?: string | null;
  allIns?: boolean;
  excludedIds?: string[];
  excludedNames?: string[];
};

export type TrackAudioSourcePlugs = {
  trackKey: string;
  plugs: BlockPlug[];
};

type ParentModuleUpdate<T extends ModuleType = ModuleType> =
  | (IModule<T> & {
      state?: ModuleTypeToStateMapping[T];
      voices?: number;
    })
  | {
      id: string;
      moduleType: T;
      name: string;
      props: IModule<T>["props"];
      state?: ModuleTypeToStateMapping[T];
      voices: number;
    };

export function getTrackKeyFromModuleId(moduleId: string): string | undefined {
  const [scope] = moduleId.split(".", 1);
  return scope?.startsWith("track-") ? scope : undefined;
}

export function normalizeWorkerModuleId(trackKey: string, moduleId: string) {
  const runtimePrefix = `${trackKey}.runtime.`;
  const trackPrefix = `${trackKey}.`;

  if (moduleId.startsWith(runtimePrefix)) {
    return moduleId;
  }

  if (moduleId.startsWith(trackPrefix)) {
    return moduleId.slice(trackPrefix.length);
  }

  return moduleId;
}

function isTrackEnabled(
  trackDocument: InstrumentDocument["tracks"][number],
): boolean {
  return trackDocument.enabled !== false;
}

function resolveLocalTrackOutputPlugs(
  track: ReturnType<typeof createTrackFromDocument>,
  outputName: string,
): BlockPlug[] {
  const output = track.findOutput(outputName);

  return output.plugs.flatMap((plug) => {
    const block = track.findBlock(plug.blockKey);
    const blockOutput = block.findOutput(plug.ioName);

    return blockOutput.plugs.map((blockPlug) => ({ ...blockPlug }));
  });
}

export function createTrackAudioSourcePlugs(
  document: InstrumentDocument,
  trackVoices = DEFAULT_TRACK_VOICES,
): TrackAudioSourcePlugs[] {
  return document.tracks.filter(isTrackEnabled).map((trackDocument) => {
    const track = createTrackFromDocument(trackDocument, trackVoices);
    const scopedAudioOut = scopeTrackIO(
      track.key,
      track,
      track.findOutput("audio out"),
      "output",
    );

    return {
      trackKey: track.key,
      plugs: [...scopedAudioOut.plugs],
    };
  });
}

function createWorkerStepSequencerModule(
  id: string,
  trackDocument: InstrumentTrackDocument,
): IEngineSerialize["modules"][number] {
  return {
    id,
    name: `${trackDocument.key} Step Sequencer`,
    moduleType: ModuleType.StepSequencer,
    voiceNo: 0,
    props: {
      patterns: [
        {
          name: "A",
          pages: trackDocument.sequencer.pages.map((page) => ({
            name: page.name,
            steps: page.steps.map((step) => ({
              active: step.active,
              notes: step.notes.map((note) => ({
                note: note.note,
                velocity: note.velocity,
              })),
              ccMessages: [],
              probability: step.probability,
              microtimeOffset: step.microtimeOffset,
              duration: step.duration,
            })),
          })),
        },
      ],
      activePatternNo: 0,
      activePageNo: 0,
      loopLength: trackDocument.sequencer.loopLength,
      stepsPerPage: 16,
      resolution: trackDocument.sequencer.resolution,
      playbackMode: trackDocument.sequencer.playbackMode,
      patternSequence: "",
      enableSequence: false,
    },
    inputs: [],
    outputs: [],
  };
}

function toSerializableRuntimeModule(module: {
  id: string;
  name: string;
  moduleType: ModuleType;
  props: Record<string, unknown>;
  voices?: number;
}): IEngineSerialize["modules"][number] {
  if (module.voices !== undefined) {
    return {
      ...module,
      voices: module.voices,
      inputs: [],
      outputs: [],
    };
  }

  return {
    ...module,
    voiceNo: 0,
    inputs: [],
    outputs: [],
  };
}

export function createMultiprocessTrackWorkerSpecs(
  document: InstrumentDocument,
  options: {
    trackVoices?: number;
    noteInputSelection?: MidiPortSelection | false;
  } = {},
): MultiprocessTrackWorkerSpec[] {
  const trackVoices = options.trackVoices ?? DEFAULT_TRACK_VOICES;

  return document.tracks.filter(isTrackEnabled).map((trackDocument) => {
    const track = createTrackFromDocument(trackDocument, trackVoices);
    const runtimePatch = createTrackEnginePatch(track, {
      noteInput:
        trackDocument.noteSource === "externalMidi"
          ? (options.noteInputSelection ?? false)
          : false,
      controllerInput: false,
      controllerOutput: false,
      master: false,
    });
    const workerPatch =
      trackDocument.noteSource === "externalMidi"
        ? applyMidiInputSelectionToPatch(
            runtimePatch.patch,
            `${track.key}.runtime.noteInput`,
            options.noteInputSelection ?? false,
          )
        : runtimePatch.patch;
    const stepSequencerId = `${track.key}.runtime.stepSequencer`;
    const sequencerRuntime =
      trackDocument.noteSource === "stepSequencer"
        ? track.createInternalMidiRuntime(
            { moduleId: stepSequencerId, ioName: "midi" },
            {
              includeModules: true,
            },
          )
        : { modules: [], routes: [] };
    const sequencerModules =
      trackDocument.noteSource === "stepSequencer"
        ? [createWorkerStepSequencerModule(stepSequencerId, trackDocument)]
        : [];

    return {
      trackKey: track.key,
      patch: {
        ...workerPatch,
        modules: [
          ...workerPatch.modules,
          ...sequencerModules,
          ...sequencerRuntime.modules.map(toSerializableRuntimeModule),
        ],
        routes: [...workerPatch.routes, ...sequencerRuntime.routes],
      },
      parentAudioSourcePlugs: scopeTrackIO(
        track.key,
        track,
        track.findOutput("audio out"),
        "output",
      ).plugs,
      workerAudioSourcePlugs: resolveLocalTrackOutputPlugs(track, "audio out"),
      bpm: document.globalBlock.tempo,
      swing: document.globalBlock.swing,
    };
  });
}

function getMidiInputSelectionFromPatch(
  patch: IEngineSerialize,
  moduleId: string | undefined,
): MidiPortSelection | false {
  if (!moduleId) {
    return false;
  }

  const module = patch.modules.find((candidate) => candidate.id === moduleId);
  if (!module || module.moduleType !== ModuleType.MidiInput) {
    return false;
  }

  const props = module.props as Partial<MidiPortSelection>;

  return {
    selectedId:
      typeof props.selectedId === "string" || props.selectedId === null
        ? props.selectedId
        : null,
    selectedName:
      typeof props.selectedName === "string" || props.selectedName === null
        ? props.selectedName
        : null,
    allIns: props.allIns === true,
    excludedIds: Array.isArray(props.excludedIds)
      ? props.excludedIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    excludedNames: Array.isArray(props.excludedNames)
      ? props.excludedNames.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  };
}

function applyMidiInputSelectionToPatch(
  patch: IEngineSerialize,
  moduleId: string,
  selection: MidiPortSelection | false,
) {
  if (selection === false) {
    return patch;
  }

  return {
    ...patch,
    modules: patch.modules.map((module) =>
      module.id === moduleId && module.moduleType === ModuleType.MidiInput
        ? {
            ...module,
            props: {
              selectedId: selection.selectedId ?? null,
              selectedName: selection.selectedName ?? null,
              allIns: selection.allIns ?? false,
              excludedIds: selection.excludedIds ?? [],
              excludedNames: selection.excludedNames ?? [],
            },
          }
        : module,
    ),
  };
}

export function createTrackWorkerPropSync(options: {
  transportControlId: string;
  workers: Map<string, MultiprocessTrackWorkerHandle>;
}) {
  const { transportControlId, workers } = options;

  return {
    forwardUpdate(update: ParentModuleUpdate) {
      if (update.id === transportControlId) {
        const transportProps = update.props as Record<string, unknown>;
        const bpm =
          typeof transportProps.bpm === "number"
            ? transportProps.bpm
            : undefined;
        const swing =
          typeof transportProps.swing === "number"
            ? transportProps.swing
            : undefined;

        if (bpm === undefined || swing === undefined) {
          return;
        }

        for (const worker of workers.values()) {
          worker.send({
            type: "setTransport",
            bpm,
            swing,
          });
        }
        return;
      }

      const trackKey = getTrackKeyFromModuleId(update.id);
      if (!trackKey) {
        return;
      }

      const worker = workers.get(trackKey);
      if (!worker) {
        return;
      }

      worker.send({
        type: "updateModule",
        update: {
          id: normalizeWorkerModuleId(trackKey, update.id),
          moduleType: update.moduleType,
          changes: {
            name: update.name,
            props: update.props as Record<string, unknown>,
            ...("voices" in update ? { voices: update.voices } : {}),
          },
        },
      });
    },
  };
}

function toTransportSwingAmount(value: number) {
  const clampedValue = Math.max(MIN_SWING, Math.min(MAX_SWING, value));

  return (
    TRANSPORT_SWING_MIN +
    clampedValue * (TRANSPORT_SWING_MAX - TRANSPORT_SWING_MIN)
  );
}

function resolveMultiprocessTrackWorkerModule() {
  const currentPath = fileURLToPath(import.meta.url);
  const isSourceModule = extname(currentPath) === ".ts";

  return {
    modulePath: fileURLToPath(
      new URL(
        isSourceModule
          ? "./multiprocessTrackWorker.ts"
          : "./multiprocessTrackWorker.js",
        import.meta.url,
      ),
    ),
    execArgv: isSourceModule ? ["--import", "tsx"] : [],
  };
}

function defaultSpawnWorker(
  spec: MultiprocessTrackWorkerSpec,
): SpawnedMultiprocessTrackWorkerHandle {
  const workerModule = resolveMultiprocessTrackWorkerModule();
  const child = fork(workerModule.modulePath, [], {
    execArgv: workerModule.execArgv,
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  }) as unknown as SpawnedMultiprocessTrackWorkerHandle;

  child.trackKey = spec.trackKey;

  return child;
}

export async function loadInstrumentEngineWithContext(
  patch: IEngineSerialize,
  contextOptions: AudioContextOptions = {},
): Promise<Engine> {
  const context = new Context(contextOptions);
  const engine = new Engine(context);

  await engine.initialize();
  engine.timeSignature = patch.timeSignature;
  engine.bpm = patch.bpm;
  patch.modules.forEach((module) => {
    engine.addModule(module);
  });
  patch.routes.forEach((route) => {
    engine.addRoute(route);
  });

  return engine;
}

function getAudioNodes(io: unknown): AudioNode[] {
  const monoAudioIO = io as
    | {
        getAudioNode?: () => AudioNode;
      }
    | undefined;
  if (
    monoAudioIO &&
    typeof monoAudioIO === "object" &&
    typeof monoAudioIO.getAudioNode === "function"
  ) {
    return [monoAudioIO.getAudioNode()];
  }

  const polyAudioIO = io as
    | {
        findIOByVoice?: (voice: number) => {
          getAudioNode: () => AudioNode;
        };
        module?: {
          voices?: number;
        };
      }
    | undefined;
  if (
    polyAudioIO &&
    typeof polyAudioIO === "object" &&
    typeof polyAudioIO.findIOByVoice === "function" &&
    polyAudioIO.module &&
    typeof polyAudioIO.module === "object" &&
    typeof polyAudioIO.module.voices === "number"
  ) {
    return Array.from({ length: polyAudioIO.module.voices }, (_, voice) => {
      const monoIO = polyAudioIO.findIOByVoice!(voice);

      return monoIO.getAudioNode();
    });
  }

  throw new Error("Audio IO does not expose audio nodes");
}

function getAudioOutputNode(engine: Engine, plug: BlockPlug) {
  return getAudioNodes(engine.findIO(plug.moduleId, plug.ioName, "output"));
}

function getMasterFilterInputNode(engine: Engine, masterFilterId: string) {
  return getAudioNodes(engine.findIO(masterFilterId, "in", "input"));
}

export function wireTrackAudioImports(
  engine: Engine,
  options: {
    masterFilterId: string;
    trackAudioSources: TrackAudioSourcePlugs[];
    createImportNode?: (context: Context) => PcmImportNode;
  },
) {
  const destinationNodes = getMasterFilterInputNode(
    engine,
    options.masterFilterId,
  );
  const createImportNode = options.createImportNode ?? createPcmImportNode;
  const importNodes = new Map<string, PcmImportNode>();

  for (const track of options.trackAudioSources) {
    for (const plug of track.plugs) {
      const outputNodes = getAudioOutputNode(engine, plug);

      for (const outputNode of outputNodes) {
        for (const destinationNode of destinationNodes) {
          try {
            outputNode.disconnect(destinationNode);
          } catch {
            // Track routes are disconnected opportunistically.
          }
        }
      }
    }

    const importNode = createImportNode(engine.context);
    for (const destinationNode of destinationNodes) {
      importNode.connect(destinationNode);
    }
    importNodes.set(track.trackKey, importNode);
  }

  return importNodes;
}

function isPcmChunkMessage(value: unknown): value is PcmChunkMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<PcmChunkMessage>;
  return (
    message.type === "pcm-chunk" &&
    typeof message.frames === "number" &&
    Array.isArray(message.channels)
  );
}

export type MultiprocessTrackWorkerController = {
  handleMessage: (message: MultiprocessTrackWorkerMessage) => Promise<boolean>;
};

export function createMultiprocessTrackWorkerController(
  dependencies: {
    loadEngine?: (
      patch: IEngineSerialize,
      contextOptions: AudioContextOptions,
    ) => Promise<Engine>;
    sendMessage?: (message: MultiprocessTrackWorkerEvent) => void;
  } = {},
): MultiprocessTrackWorkerController {
  const loadEngine = dependencies.loadEngine ?? loadInstrumentEngineWithContext;
  const sendMessage = dependencies.sendMessage ?? (() => undefined);
  let currentSpec: MultiprocessTrackWorkerSpec | undefined;
  let engine: Engine | undefined;
  let exportNode: AudioWorkletNode | undefined;
  let exportOutputNode: AudioNode | undefined;
  let exportMonitor:
    | {
        audioNode: AudioNode;
        getValues: () => Float32Array;
      }
    | undefined;
  let exportMonitorInterval: ReturnType<typeof setInterval> | undefined;

  const requireReady = () => {
    if (!currentSpec || !engine) {
      throw new Error("Multiprocess track worker is not initialized");
    }

    return { currentSpec, engine };
  };

  const applyTransport = (targetEngine: Engine, bpm: number, swing: number) => {
    targetEngine.bpm = bpm;
    targetEngine.transport.swingAmount = toTransportSwingAmount(swing);
  };

  return {
    async handleMessage(message) {
      try {
        switch (message.type) {
          case "init": {
            currentSpec = message.spec;
            engine = await loadEngine(message.spec.patch, {
              sinkId: "none",
            } as AudioContextOptions);
            engine.addModule({
              id: EXPORT_MONITOR_ID,
              name: "Multiprocess Export Inspector",
              moduleType: ModuleType.Inspector,
              props: {},
            });
            await loadMultiprocessAudioBridgeProcessors(engine.context);
            exportNode = createPcmExportNode(engine.context);
            exportMonitor = engine.findModule(EXPORT_MONITOR_ID) as {
              audioNode: AudioNode;
              getValues: () => Float32Array;
            };
            exportOutputNode = exportMonitor.audioNode;
            exportNode.port.onmessage = (event: MessageEvent<unknown>) => {
              if (!isPcmChunkMessage(event.data)) {
                return;
              }

              const { channels, frames } = event.data;

              sendMessage({
                type: "pcm-chunk",
                trackKey: message.spec.trackKey,
                channels,
                frames,
              });
            };

            exportNode.connect(exportOutputNode);
            exportOutputNode.connect(engine.context.destination);
            exportMonitorInterval = setInterval(() => {
              if (exportMonitor) {
                exportMonitor.getValues();
              }
            }, 16);
            message.spec.workerAudioSourcePlugs.forEach((plug) => {
              getAudioOutputNode(engine!, plug).forEach((audioNode) => {
                audioNode.connect(exportNode!);
              });
            });
            applyTransport(engine, message.spec.bpm, message.spec.swing);
            sendMessage({
              type: "ready",
              trackKey: message.spec.trackKey,
              pid: process.pid,
            });
            return false;
          }
          case "setTransport": {
            const state = requireReady();
            applyTransport(state.engine, message.bpm, message.swing);
            return false;
          }
          case "start": {
            await requireReady().engine.start();
            return false;
          }
          case "stop": {
            requireReady().engine.stop();
            return false;
          }
          case "updateModule": {
            requireReady().engine.updateModule(
              message.update as IUpdateModule<ModuleType>,
            );
            return false;
          }
          case "triggerVirtualMidi": {
            requireReady().engine.triggerVirtualMidi(
              message.moduleId,
              message.note,
              message.midiType,
            );
            return false;
          }
          case "shutdown": {
            exportNode?.disconnect();
            exportOutputNode?.disconnect();
            if (exportMonitorInterval) {
              clearInterval(exportMonitorInterval);
              exportMonitorInterval = undefined;
            }
            engine?.dispose();
            engine = undefined;
            return true;
          }
        }
      } catch (error) {
        sendMessage({
          type: "error",
          trackKey: currentSpec?.trackKey,
          message: error instanceof Error ? error.message : String(error),
        });

        return false;
      }
    },
  };
}

export async function createMultiprocessInstrumentEngine(
  document: InstrumentDocument,
  session: InstrumentSession,
  options: CreateMultiprocessInstrumentEngineOptions = {},
): Promise<InstrumentSessionEngine> {
  const log = options.log ?? console.log;
  const parentEngine = await (
    options.loadParentEngine ?? loadInstrumentEngineWithContext
  )(session.patch);

  await loadMultiprocessAudioBridgeProcessors(parentEngine.context);
  const workerSpecs = createMultiprocessTrackWorkerSpecs(document, {
    trackVoices: options.trackVoices,
    noteInputSelection: getMidiInputSelectionFromPatch(
      session.patch,
      session.runtime.noteInputId,
    ),
  });
  const importNodes = wireTrackAudioImports(parentEngine, {
    masterFilterId: session.runtime.masterFilterId,
    trackAudioSources: workerSpecs.map((spec) => ({
      trackKey: spec.trackKey,
      plugs: spec.parentAudioSourcePlugs,
    })),
  });
  const workers = new Map<string, SpawnedMultiprocessTrackWorkerHandle>();

  await Promise.all(
    workerSpecs.map(
      (spec) =>
        new Promise<void>((resolve, reject) => {
          const worker = (options.spawnWorker ?? defaultSpawnWorker)(spec);
          let ready = false;

          worker.on("message", (message) => {
            const event = message as MultiprocessTrackWorkerEvent;
            if (event.type === "ready") {
              ready = true;
              log(`Track worker ready: ${event.trackKey} (pid ${event.pid})`);
              resolve();
              return;
            }

            if (event.type === "pcm-chunk") {
              importNodes.get(event.trackKey)?.enqueue({
                type: "pcm-chunk",
                channels: event.channels,
                frames: event.frames,
              });
              return;
            }

            const target = event.trackKey ?? spec.trackKey;
            const error = new Error(event.message);
            log(`Track worker error: ${target}: ${event.message}`);
            if (!ready) {
              reject(error);
            }
          });

          worker.on("error", (error) => {
            const message =
              error instanceof Error ? error.message : String(error);
            log(`Track worker process error (${spec.trackKey}): ${message}`);
            if (!ready) {
              reject(error instanceof Error ? error : new Error(message));
            }
          });

          workers.set(spec.trackKey, worker);
          worker.send({
            type: "init",
            spec,
          });
        }),
    ),
  );

  const propSync = createTrackWorkerPropSync({
    transportControlId: session.runtime.transportControlId,
    workers,
  });
  parentEngine.onPropsUpdate((update) => {
    propSync.forwardUpdate(update);
  });

  const broadcast = (message: MultiprocessTrackWorkerMessage) => {
    for (const worker of workers.values()) {
      worker.send(message);
    }
  };

  return {
    get state() {
      return parentEngine.state;
    },
    get transport() {
      return parentEngine.transport;
    },
    start: async () => {
      await parentEngine.start();
      broadcast({ type: "start" });
    },
    stop: () => {
      broadcast({ type: "stop" });
      parentEngine.stop();
    },
    dispose: () => {
      broadcast({ type: "shutdown" });
      importNodes.forEach((node) => {
        node.disconnect();
      });
      parentEngine.dispose();
      workers.forEach((worker) => {
        worker.kill?.();
      });
    },
    serialize: () => parentEngine.serialize(),
    findMidiInputDeviceByFuzzyName: (...args) =>
      parentEngine.findMidiInputDeviceByFuzzyName(...args),
    findMidiOutputDeviceByFuzzyName: (...args) =>
      parentEngine.findMidiOutputDeviceByFuzzyName(...args),
    triggerVirtualMidi: (
      moduleId: string,
      note: string,
      type: "noteOn" | "noteOff",
    ) => {
      parentEngine.triggerVirtualMidi(moduleId, note, type);
      const trackKey = getTrackKeyFromModuleId(moduleId);
      if (!trackKey) {
        return;
      }

      workers.get(trackKey)?.send({
        type: "triggerVirtualMidi",
        moduleId,
        note,
        midiType: type,
      });
    },
    updateModule: <T extends ModuleType>(params: IUpdateModule<T>) =>
      parentEngine.updateModule(params),
    onPropsUpdate: (callback) => {
      parentEngine.onPropsUpdate(callback);
    },
    findModule: (id: string) => parentEngine.findModule(id),
  };
}
