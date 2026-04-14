import { Engine, type IEngineSerialize, ModuleType } from "@blibliki/engine";
import {
  createTrackEnginePatch,
  createTrackFromDocument,
  type InstrumentDocument,
  type InstrumentTrackDocument,
} from "@blibliki/instrument";
import { Context } from "@blibliki/utils";
import { fork } from "node:child_process";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

type SerializableRuntimeModule = {
  id: string;
  name: string;
  moduleType: ModuleType;
  props: Record<string, unknown>;
  voices?: number;
};

type TimerHandle = ReturnType<typeof setInterval>;
type TimeoutHandle = ReturnType<typeof setTimeout>;

export type TrackProcessBenchmarkContextOptions = AudioContextOptions & {
  sinkId?: string;
};

export type TrackProcessBenchmarkWorkerSpec = {
  trackKey: string;
  trackName: string;
  midiChannel: number;
  benchmarkMidiId: string;
  benchmarkNote: string;
  patch: IEngineSerialize;
};

export type TrackProcessBenchmarkWorkerMessage =
  | {
      type: "init";
      spec: TrackProcessBenchmarkWorkerSpec;
    }
  | {
      type: "start";
    }
  | {
      type: "stop";
    }
  | {
      type: "setBpm";
      bpm: number;
    }
  | {
      type: "noteOn";
      note?: string;
    }
  | {
      type: "noteOff";
      note?: string;
    }
  | {
      type: "shutdown";
    };

export type TrackProcessBenchmarkWorkerEvent =
  | {
      type: "ready";
      trackKey: string;
      pid: number;
    }
  | {
      type: "error";
      trackKey?: string;
      message: string;
    };

export type TrackProcessBenchmarkWorkerHandle = {
  pid?: number;
  messages?: unknown[];
  killed?: boolean;
  send: (message: TrackProcessBenchmarkWorkerMessage) => boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => unknown;
  kill?: (signal?: NodeJS.Signals | number) => boolean;
};

export type TrackProcessBenchmarkEngine = Pick<
  Engine,
  "start" | "stop" | "dispose" | "triggerVirtualMidi"
> & {
  bpm: number;
};

export type TrackProcessBenchmark = {
  specs: TrackProcessBenchmarkWorkerSpec[];
  workers: Map<string, TrackProcessBenchmarkWorkerHandle>;
  start: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  dispose: () => void;
};

export type CreateTrackProcessBenchmarkOptions = {
  bpm?: number;
  trackVoices?: number;
  benchmarkNote?: string;
};

export type TrackProcessBenchmarkDependencies = {
  spawnWorker?: (
    spec: TrackProcessBenchmarkWorkerSpec,
  ) => TrackProcessBenchmarkWorkerHandle;
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
  log?: (message: string) => void;
};

export type TrackProcessBenchmarkWorkerController = {
  handleMessage: (
    message: TrackProcessBenchmarkWorkerMessage,
  ) => Promise<boolean>;
};

type CreateTrackProcessBenchmarkWorkerControllerDependencies = {
  loadEngine?: (
    patch: IEngineSerialize,
    contextOptions: TrackProcessBenchmarkContextOptions,
  ) => Promise<TrackProcessBenchmarkEngine>;
  sendMessage?: (message: TrackProcessBenchmarkWorkerEvent) => void;
};

const DEFAULT_BENCHMARK_NOTE = "C3";
const DEFAULT_TRACK_VOICES = 8;
const DEFAULT_BPM = 120;
const DEFAULT_NOTE_LENGTH_RATIO = 0.5;
const MIN_NOTE_LENGTH_MS = 25;

function isTrackEnabled(trackDocument: InstrumentTrackDocument) {
  return trackDocument.enabled !== false;
}

function createRuntimeModuleId(trackKey: string, suffix: string) {
  return `${trackKey}.runtime.${suffix}`;
}

function createBenchmarkMidiModule(
  id: string,
): IEngineSerialize["modules"][number] {
  return {
    id,
    name: "Track Benchmark MIDI",
    moduleType: ModuleType.VirtualMidi,
    voiceNo: 0,
    props: {
      activeNotes: [],
    },
    inputs: [],
    outputs: [],
  };
}

function toEngineSerializableModule(
  module: SerializableRuntimeModule,
): IEngineSerialize["modules"][number] {
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

function resolveWorkerModule() {
  const currentPath = fileURLToPath(import.meta.url);
  const isSourceModule = extname(currentPath) === ".ts";

  return {
    modulePath: fileURLToPath(
      new URL(
        isSourceModule
          ? "./trackProcessBenchmarkWorker.ts"
          : "./trackProcessBenchmarkWorker.js",
        import.meta.url,
      ),
    ),
    execArgv: isSourceModule ? ["--import", "tsx"] : [],
  };
}

function defaultSpawnWorker(): TrackProcessBenchmarkWorkerHandle {
  const workerModule = resolveWorkerModule();

  return fork(workerModule.modulePath, [], {
    execArgv: workerModule.execArgv,
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
}

function getPulseIntervalMs(bpm: number) {
  return 60_000 / Math.max(bpm, 1);
}

function getNoteLengthMs(bpm: number) {
  return Math.max(
    MIN_NOTE_LENGTH_MS,
    Math.round(getPulseIntervalMs(bpm) * DEFAULT_NOTE_LENGTH_RATIO),
  );
}

export function createTrackProcessBenchmarkWorkerSpecs(
  document: InstrumentDocument,
  options: CreateTrackProcessBenchmarkOptions = {},
): TrackProcessBenchmarkWorkerSpec[] {
  const benchmarkNote = options.benchmarkNote ?? DEFAULT_BENCHMARK_NOTE;
  const trackVoices = options.trackVoices ?? DEFAULT_TRACK_VOICES;

  return document.tracks.filter(isTrackEnabled).map((trackDocument) => {
    const track = createTrackFromDocument(trackDocument, trackVoices);
    const runtimePatch = createTrackEnginePatch(track, {
      noteInput: false,
      controllerInput: false,
      controllerOutput: false,
    });
    const benchmarkMidiId = createRuntimeModuleId(track.key, "benchmarkMidi");
    const benchmarkRuntime = track.createInternalMidiRuntime(
      { moduleId: benchmarkMidiId, ioName: "midi out" },
      {
        scopeBlockPlugs: true,
      },
    );

    return {
      trackKey: track.key,
      trackName: trackDocument.name ?? track.key,
      midiChannel: trackDocument.midiChannel,
      benchmarkMidiId,
      benchmarkNote,
      patch: {
        ...runtimePatch.patch,
        modules: [
          ...runtimePatch.patch.modules,
          ...benchmarkRuntime.modules.map(toEngineSerializableModule),
          createBenchmarkMidiModule(benchmarkMidiId),
        ],
        routes: [...runtimePatch.patch.routes, ...benchmarkRuntime.routes],
      },
    };
  });
}

export function createTrackProcessBenchmark(
  document: InstrumentDocument,
  options: CreateTrackProcessBenchmarkOptions = {},
  dependencies: TrackProcessBenchmarkDependencies = {},
): TrackProcessBenchmark {
  const specs = createTrackProcessBenchmarkWorkerSpecs(document, options);
  const workers = new Map<string, TrackProcessBenchmarkWorkerHandle>();
  const log = dependencies.log ?? console.log;
  const spawnWorker = dependencies.spawnWorker ?? defaultSpawnWorker;
  const setIntervalImpl = dependencies.setInterval ?? globalThis.setInterval;
  const clearIntervalImpl =
    dependencies.clearInterval ?? globalThis.clearInterval;
  const setTimeoutImpl = dependencies.setTimeout ?? globalThis.setTimeout;
  const clearTimeoutImpl = dependencies.clearTimeout ?? globalThis.clearTimeout;
  const note = options.benchmarkNote ?? DEFAULT_BENCHMARK_NOTE;
  let bpm = options.bpm ?? DEFAULT_BPM;
  let pulseTimer: TimerHandle | undefined;
  const noteOffTimers = new Set<TimeoutHandle>();

  const broadcast = (message: TrackProcessBenchmarkWorkerMessage) => {
    for (const worker of workers.values()) {
      worker.send(message);
    }
  };

  const clearScheduledNotes = () => {
    for (const timer of noteOffTimers) {
      clearTimeoutImpl(timer);
    }
    noteOffTimers.clear();
  };

  const schedulePulse = () => {
    broadcast({ type: "noteOn", note });

    const noteOffTimer = setTimeoutImpl(() => {
      broadcast({ type: "noteOff", note });
      noteOffTimers.delete(noteOffTimer);
    }, getNoteLengthMs(bpm));

    noteOffTimers.add(noteOffTimer);
  };

  const restartPulseLoop = () => {
    if (pulseTimer !== undefined) {
      clearIntervalImpl(pulseTimer);
      pulseTimer = undefined;
    }

    schedulePulse();
    pulseTimer = setIntervalImpl(schedulePulse, getPulseIntervalMs(bpm));
  };

  for (const spec of specs) {
    const worker = spawnWorker(spec);
    worker.on("message", (message) => {
      const event = message as TrackProcessBenchmarkWorkerEvent;
      if (event.type === "ready") {
        log(`Track worker ready: ${event.trackKey} (pid ${event.pid})`);
      }

      if (event.type === "error") {
        const target = event.trackKey ?? "unknown-track";
        log(`Track worker error: ${target}: ${event.message}`);
      }
    });
    worker.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      log(`Track worker process error (${spec.trackKey}): ${message}`);
    });
    workers.set(spec.trackKey, worker);
    worker.send({ type: "init", spec });
  }

  return {
    specs,
    workers,
    start() {
      broadcast({ type: "setBpm", bpm });
      broadcast({ type: "start" });
      restartPulseLoop();
    },
    stop() {
      if (pulseTimer !== undefined) {
        clearIntervalImpl(pulseTimer);
        pulseTimer = undefined;
      }
      clearScheduledNotes();
      broadcast({ type: "noteOff", note });
      broadcast({ type: "stop" });
    },
    setBpm(nextBpm) {
      bpm = nextBpm;
      broadcast({ type: "setBpm", bpm });

      if (pulseTimer !== undefined) {
        restartPulseLoop();
      }
    },
    dispose() {
      this.stop();
      broadcast({ type: "shutdown" });
    },
  };
}

export async function loadTrackProcessBenchmarkEngine(
  patch: IEngineSerialize,
  contextOptions: TrackProcessBenchmarkContextOptions = { sinkId: "none" },
): Promise<TrackProcessBenchmarkEngine> {
  const context = new Context(contextOptions as AudioContextOptions);
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

export function createTrackProcessBenchmarkWorkerController(
  dependencies: CreateTrackProcessBenchmarkWorkerControllerDependencies = {},
): TrackProcessBenchmarkWorkerController {
  const loadEngine = dependencies.loadEngine ?? loadTrackProcessBenchmarkEngine;
  const sendMessage = dependencies.sendMessage ?? (() => undefined);
  let currentSpec: TrackProcessBenchmarkWorkerSpec | undefined;
  let engine: TrackProcessBenchmarkEngine | undefined;

  const requireReady = () => {
    if (!currentSpec || !engine) {
      throw new Error("Track process benchmark worker is not initialized");
    }

    return { currentSpec, engine };
  };

  return {
    async handleMessage(message) {
      try {
        switch (message.type) {
          case "init": {
            currentSpec = message.spec;
            engine = await loadEngine(message.spec.patch, {
              sinkId: "none",
            });
            sendMessage({
              type: "ready",
              trackKey: message.spec.trackKey,
              pid: process.pid,
            });
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
          case "setBpm": {
            requireReady().engine.bpm = message.bpm;
            return false;
          }
          case "noteOn": {
            const state = requireReady();
            state.engine.triggerVirtualMidi(
              state.currentSpec.benchmarkMidiId,
              message.note ?? state.currentSpec.benchmarkNote,
              "noteOn",
            );
            return false;
          }
          case "noteOff": {
            const state = requireReady();
            state.engine.triggerVirtualMidi(
              state.currentSpec.benchmarkMidiId,
              message.note ?? state.currentSpec.benchmarkNote,
              "noteOff",
            );
            return false;
          }
          case "shutdown": {
            if (engine) {
              engine.dispose();
            }
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
