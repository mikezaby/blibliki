import { ModuleType } from "@blibliki/engine";
import {
  createDefaultInstrumentDocument,
  createDefaultPlayableInstrumentDocument,
} from "@blibliki/instrument";
import { fork } from "node:child_process";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  createMultiprocessInstrumentEngine,
  createMultiprocessTrackWorkerController,
  createMultiprocessTrackWorkerSpecs,
  createTrackAudioSourcePlugs,
  loadInstrumentEngineWithContext,
  createTrackWorkerPropSync,
  normalizeWorkerModuleId,
  type MultiprocessTrackWorkerHandle,
  type MultiprocessTrackWorkerEvent,
} from "@/multiprocessInstrumentEngine";
import { createInstrumentSession } from "@/instrumentSession";
import {
  createPcmExportNode,
  loadMultiprocessAudioBridgeProcessors,
  type PcmChunkMessage,
} from "@/multiprocessAudioBridge";

function getAudioNodesForTest(io: unknown): AudioNode[] {
  const monoAudioIO = io as { getAudioNode?: () => AudioNode } | undefined;
  if (typeof monoAudioIO?.getAudioNode === "function") {
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
    typeof polyAudioIO?.findIOByVoice === "function" &&
    typeof polyAudioIO.module?.voices === "number"
  ) {
    return Array.from({ length: polyAudioIO.module.voices }, (_, voice) =>
      polyAudioIO.findIOByVoice!(voice).getAudioNode(),
    );
  }

  throw new Error("Audio IO does not expose audio nodes in test");
}

function getChunkPeak(event: MultiprocessTrackWorkerEvent) {
  if (event.type !== "pcm-chunk") {
    return 0;
  }

  const toArrayBuffer = (buffer: unknown) => {
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }

    if (ArrayBuffer.isView(buffer)) {
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
    }

    if (
      buffer &&
      typeof buffer === "object" &&
      "data" in buffer &&
      Array.isArray(buffer.data)
    ) {
      return Uint8Array.from(buffer.data).buffer;
    }

    return new ArrayBuffer(0);
  };

  return Math.max(
    ...event.channels.flatMap((buffer) =>
      Array.from(
        new Float32Array(toArrayBuffer(buffer)),
        (value) => Math.abs(value),
      ),
    ),
  );
}

describe("createTrackAudioSourcePlugs", () => {
  it("returns scoped audio output plugs for each enabled track", () => {
    const document = createDefaultPlayableInstrumentDocument();
    const disabledTrack = document.tracks[1];
    if (!disabledTrack) {
      throw new Error("Expected second track in default playable document");
    }

    document.tracks[1] = {
      ...disabledTrack,
      enabled: false,
    };

    const plugs = createTrackAudioSourcePlugs(document);

    expect(plugs.map((entry) => entry.trackKey)).toEqual([
      "track-1",
      "track-3",
      "track-4",
      "track-5",
      "track-6",
      "track-7",
      "track-8",
    ]);
    expect(
      plugs[0]?.plugs.some((plug) => plug.moduleId.startsWith("track-1.")),
    ).toBe(true);
  });
});

describe("createMultiprocessTrackWorkerSpecs", () => {
  it("uses local worker output plugs and scoped parent output plugs separately", () => {
    const document = createDefaultPlayableInstrumentDocument();

    const [spec] = createMultiprocessTrackWorkerSpecs(document);

    expect(
      spec?.parentAudioSourcePlugs.some((plug) =>
        plug.moduleId.startsWith("track-1."),
      ),
    ).toBe(true);
    expect(
      spec?.workerAudioSourcePlugs.some(
        (plug) =>
          plug.moduleId === "trackGain.main" &&
          !plug.moduleId.startsWith("track-1."),
      ),
    ).toBe(true);
  });

  it("includes a local step sequencer module for sequencer-driven tracks", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      noteSource: "stepSequencer",
      sourceProfileId: "osc",
    };

    const [spec] = createMultiprocessTrackWorkerSpecs(document);

    expect(
      spec?.patch.modules.some(
        (module) =>
          module.id === "track-1.runtime.stepSequencer" &&
          module.moduleType === ModuleType.StepSequencer,
      ),
    ).toBe(true);
    expect(
      spec?.patch.routes.some(
        ({ source, destination }) =>
          source.moduleId === "track-1.runtime.stepSequencer" &&
          source.ioName === "midi" &&
          destination.moduleId === "track-1.runtime.voiceScheduler" &&
          destination.ioName === "midi in",
      ),
    ).toBe(true);
  });

  it("uses the instrument note input selection for external MIDI worker tracks", () => {
    const document = createDefaultInstrumentDocument();
    const [spec] = createMultiprocessTrackWorkerSpecs(document, {
      noteInputSelection: {
        selectedId: null,
        selectedName: "All ins",
        allIns: true,
        excludedIds: ["computer_keyboard", "controller-in"],
        excludedNames: ["LCXL3 DAW In"],
      },
    });

    const noteInputModule = spec?.patch.modules.find(
      (module) => module.id === "track-1.runtime.noteInput",
    );

    expect(noteInputModule?.moduleType).toBe(ModuleType.MidiInput);
    expect(noteInputModule?.props).toEqual({
      selectedId: null,
      selectedName: "All ins",
      allIns: true,
      excludedIds: ["computer_keyboard", "controller-in"],
      excludedNames: ["LCXL3 DAW In"],
    });
  });
});

describe("createTrackWorkerPropSync", () => {
  function createWorker(trackKey: string) {
    const send =
      vi.fn<
        (
          message: Parameters<MultiprocessTrackWorkerHandle["send"]>[0],
        ) => boolean
      >();

    return {
      trackKey,
      send,
    } satisfies MultiprocessTrackWorkerHandle;
  }

  it("forwards track-scoped module updates only to the owning worker", () => {
    const track1 = createWorker("track-1");
    const track2 = createWorker("track-2");
    const sync = createTrackWorkerPropSync({
      transportControlId: "instrument.runtime.transportControl",
      workers: new Map([
        ["track-1", track1],
        ["track-2", track2],
      ]),
    });

    sync.forwardUpdate({
      id: "track-2.source.main",
      moduleType: ModuleType.Oscillator,
      voiceNo: 0,
      name: "Track 2 Oscillator",
      props: {
        type: "square",
      },
    });

    expect(track1.send).not.toHaveBeenCalled();
    expect(track2.send).toHaveBeenCalledWith({
      type: "updateModule",
      update: {
        id: "source.main",
        moduleType: ModuleType.Oscillator,
        changes: {
          name: "Track 2 Oscillator",
          props: {
            type: "square",
          },
        },
      },
    });
  });

  it("broadcasts transport updates to every worker", () => {
    const track1 = createWorker("track-1");
    const track2 = createWorker("track-2");
    const sync = createTrackWorkerPropSync({
      transportControlId: "instrument.runtime.transportControl",
      workers: new Map([
        ["track-1", track1],
        ["track-2", track2],
      ]),
    });

    sync.forwardUpdate({
      id: "instrument.runtime.transportControl",
      moduleType: ModuleType.TransportControl,
      voiceNo: 0,
      name: "Transport",
      props: {
        bpm: 137,
        swing: 0.33,
      },
    });

    expect(track1.send).toHaveBeenCalledWith({
      type: "setTransport",
      bpm: 137,
      swing: 0.33,
    });
    expect(track2.send).toHaveBeenCalledWith({
      type: "setTransport",
      bpm: 137,
      swing: 0.33,
    });
  });
});

describe("normalizeWorkerModuleId", () => {
  it("strips the track scope from authored module ids but keeps runtime ids scoped", () => {
    expect(normalizeWorkerModuleId("track-1", "track-1.source.main")).toBe(
      "source.main",
    );
    expect(normalizeWorkerModuleId("track-1", "track-1.amp.gain")).toBe(
      "amp.gain",
    );
    expect(
      normalizeWorkerModuleId("track-1", "track-1.runtime.stepSequencer"),
    ).toBe("track-1.runtime.stepSequencer");
  });
});

describe("createMultiprocessTrackWorkerController", () => {
  it(
    "emits pcm chunks for a sequencer-driven track after init and start",
    async () => {
      const document = createDefaultInstrumentDocument();
      const firstTrack = document.tracks[0];
      if (!firstTrack) {
        throw new Error("Expected default instrument to include a first track");
      }

      document.tracks[0] = {
        ...firstTrack,
        noteSource: "stepSequencer",
        sourceProfileId: "osc",
        sequencer: {
          ...firstTrack.sequencer,
          pages: firstTrack.sequencer.pages.map((page, pageIndex) => ({
            ...page,
            steps: page.steps.map((step, stepIndex) =>
              pageIndex === 0 && stepIndex === 0
                ? {
                    ...step,
                    active: true,
                    notes: [{ note: "C3", velocity: 100 }],
                  }
                : step,
            ),
          })),
        },
      };

      const [spec] = createMultiprocessTrackWorkerSpecs(document);
      if (!spec) {
        throw new Error("Expected a worker spec for the first track");
      }

      const events: MultiprocessTrackWorkerEvent[] = [];
      const controller = createMultiprocessTrackWorkerController({
        sendMessage: (message) => {
          events.push(message);
        },
      });

      await controller.handleMessage({
        type: "init",
        spec,
      });
      await controller.handleMessage({
        type: "start",
      });

      const startedAt = Date.now();
      let chunkPeak = 0;
      while (Date.now() - startedAt < 5000) {
        chunkPeak = Math.max(...events.map(getChunkPeak), 0);
        if (chunkPeak > 0.01) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(events.some((event) => event.type === "ready")).toBe(true);
      expect(events.some((event) => event.type === "pcm-chunk")).toBe(true);

      await controller.handleMessage({
        type: "shutdown",
      });
    },
    10000,
  );

  it(
    "keeps non-zero audio on the export node output when fed from trackGain.main",
    async () => {
      const document = createDefaultInstrumentDocument();
      const firstTrack = document.tracks[0];
      if (!firstTrack) {
        throw new Error("Expected default instrument to include a first track");
      }

      document.tracks[0] = {
        ...firstTrack,
        noteSource: "stepSequencer",
        sourceProfileId: "osc",
        sequencer: {
          ...firstTrack.sequencer,
          pages: firstTrack.sequencer.pages.map((page, pageIndex) => ({
            ...page,
            steps: page.steps.map((step, stepIndex) =>
              pageIndex === 0 && stepIndex === 0
                ? {
                    ...step,
                    active: true,
                    notes: [{ note: "C3", velocity: 100 }],
                  }
                : step,
            ),
          })),
        },
      };

      const [spec] = createMultiprocessTrackWorkerSpecs(document);
      if (!spec) {
        throw new Error("Expected a worker spec for the first track");
      }

      const engine = await loadInstrumentEngineWithContext(spec.patch, {
        sinkId: "none",
      } as AudioContextOptions);

      try {
        await loadMultiprocessAudioBridgeProcessors(engine.context);

        engine.addModule({
          id: "test.export.inspector",
          name: "Inspector",
          moduleType: ModuleType.Inspector,
          voiceNo: 0,
          props: {},
          inputs: [],
          outputs: [],
        });

        const inspector = engine.findModule("test.export.inspector") as {
          audioNode: AudioNode;
          getValues: () => Float32Array;
        };
        const exportNode = createPcmExportNode(engine.context);
        let chunk: PcmChunkMessage | undefined;

        exportNode.port.onmessage = (event: MessageEvent<PcmChunkMessage>) => {
          chunk = event.data;
        };

        spec.workerAudioSourcePlugs.forEach((plug) => {
          getAudioNodesForTest(engine.findIO(plug.moduleId, plug.ioName, "output")).forEach(
            (node) => {
              node.connect(exportNode);
            },
          );
        });
        exportNode.connect(inspector.audioNode);
        inspector.audioNode.connect(engine.context.destination);

        await engine.start();

        let outputPeak = 0;
        const startedAt = Date.now();
        while (Date.now() - startedAt < 5000) {
          outputPeak = Math.max(
            ...Array.from(inspector.getValues(), (value) => Math.abs(value)),
          );
          if (outputPeak > 0.01 && getChunkPeak({
            type: "pcm-chunk",
            trackKey: spec.trackKey,
            channels: chunk?.channels ?? [],
            frames: chunk?.frames ?? 0,
          } as MultiprocessTrackWorkerEvent) > 0.01) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const chunkPeak = getChunkPeak(
          chunk
            ? ({
                type: "pcm-chunk",
                trackKey: spec.trackKey,
                channels: chunk.channels,
                frames: chunk.frames,
              } as MultiprocessTrackWorkerEvent)
            : ({ type: "ready", trackKey: spec.trackKey, pid: 0 } as MultiprocessTrackWorkerEvent),
        );

        expect(outputPeak).toBeGreaterThan(0.01);
        expect(chunkPeak).toBeGreaterThan(0.01);
      } finally {
        engine.dispose();
      }
    },
    10000,
  );
});

describe("multiprocessTrackWorker process", () => {
  it(
    "sends pcm chunks across child-process IPC for sequencer tracks",
    async () => {
      const document = createDefaultInstrumentDocument();
      const firstTrack = document.tracks[0];
      if (!firstTrack) {
        throw new Error("Expected default instrument to include a first track");
      }

      document.tracks[0] = {
        ...firstTrack,
        noteSource: "stepSequencer",
        sourceProfileId: "osc",
        sequencer: {
          ...firstTrack.sequencer,
          pages: firstTrack.sequencer.pages.map((page, pageIndex) => ({
            ...page,
            steps: page.steps.map((step, stepIndex) =>
              pageIndex === 0 && stepIndex === 0
                ? {
                    ...step,
                    active: true,
                    notes: [{ note: "C3", velocity: 100 }],
                  }
                : step,
            ),
          })),
        },
      };

      const [spec] = createMultiprocessTrackWorkerSpecs(document);
      if (!spec) {
        throw new Error("Expected a worker spec for the first track");
      }

      const workerPath = fileURLToPath(
        new URL("../src/multiprocessTrackWorker.ts", import.meta.url),
      );
      const worker = fork(workerPath, [], {
        execArgv: ["--import", "tsx"],
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });

      const events: MultiprocessTrackWorkerEvent[] = [];

      try {
        await new Promise<void>((resolve, reject) => {
          let chunkPeak = 0;
          const timeout = setTimeout(() => {
            reject(new Error("Timed out waiting for worker PCM chunk"));
          }, 8000);

          worker.on("message", (message: MultiprocessTrackWorkerEvent) => {
            events.push(message);

            if (message.type === "ready") {
              worker.send({
                type: "start",
              });
            }

            if (message.type === "error") {
              clearTimeout(timeout);
              reject(new Error(message.message));
            }

            if (message.type === "pcm-chunk") {
              chunkPeak = Math.max(...events.map(getChunkPeak), 0);
              if (chunkPeak > 0.01) {
                clearTimeout(timeout);
                resolve();
              }
            }
          });

          worker.on("error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });

          worker.send({
            type: "init",
            spec,
          });
        });
      } finally {
        worker.send({
          type: "shutdown",
        });
        worker.kill();
      }

      expect(events.some((event) => event.type === "ready")).toBe(true);
      expect(events.some((event) => event.type === "pcm-chunk")).toBe(true);
      expect(Math.max(...events.map(getChunkPeak))).toBeGreaterThan(0.01);
    },
    12000,
  );
});

describe("createMultiprocessInstrumentEngine", () => {
  it(
    "routes imported worker pcm into the parent master output",
    async () => {
      const document = createDefaultInstrumentDocument();
      const firstTrack = document.tracks[0];
      if (!firstTrack) {
        throw new Error("Expected default instrument to include a first track");
      }

      document.tracks = document.tracks.map((track, index) =>
        index === 0
          ? {
              ...firstTrack,
              enabled: true,
              noteSource: "stepSequencer",
              sourceProfileId: "osc",
            }
          : {
              ...track,
              enabled: false,
            },
      );

      const session = createInstrumentSession(document);
      let parentEngine:
        | Awaited<ReturnType<typeof loadInstrumentEngineWithContext>>
        | undefined;

      class FakeWorker extends EventEmitter {
        trackKey: string;

        constructor(trackKey: string) {
          super();
          this.trackKey = trackKey;
        }

        send(message: unknown) {
          const typedMessage = message as { type: string };

          if (typedMessage.type === "init") {
            queueMicrotask(() => {
              this.emit("message", {
                type: "ready",
                trackKey: this.trackKey,
                pid: 1,
              } satisfies MultiprocessTrackWorkerEvent);
            });
          }

          if (typedMessage.type === "start") {
            const frames = 512;
            const channel = new Float32Array(frames).fill(0.25);
            const chunk = {
              type: "pcm-chunk",
              trackKey: this.trackKey,
              channels: [channel.slice().buffer, channel.slice().buffer],
              frames,
            } satisfies MultiprocessTrackWorkerEvent;

            queueMicrotask(() => {
              this.emit("message", chunk);
              this.emit("message", chunk);
              this.emit("message", chunk);
            });
          }

          return true;
        }

        kill() {
          return true;
        }
      }

      const multiprocessEngine = await createMultiprocessInstrumentEngine(
        document,
        session,
        {
          loadParentEngine: async (patch) => {
            parentEngine = await loadInstrumentEngineWithContext(patch);
            return parentEngine;
          },
          spawnWorker: (spec) => new FakeWorker(spec.trackKey),
        },
      );

      if (!parentEngine) {
        throw new Error("Expected parent engine to be captured");
      }

      parentEngine.addModule({
        id: "test.inspector",
        name: "Inspector",
        moduleType: ModuleType.Inspector,
        voiceNo: 0,
        props: {},
        inputs: [],
        outputs: [],
      });

      const inspector = parentEngine.findModule("test.inspector") as {
        audioNode: AudioNode;
        getValues: () => Float32Array;
      };

      const masterVolumeOutput = parentEngine.findIO(
        session.runtime.masterVolumeId,
        "out",
        "output",
      );
      getAudioNodesForTest(masterVolumeOutput).forEach((node) => {
        node.connect(inspector.audioNode);
      });

      await multiprocessEngine.start();

      const startedAt = Date.now();
      while (Date.now() - startedAt < 5000) {
        const peak = Math.max(
          ...Array.from(inspector.getValues(), (value) => Math.abs(value)),
        );
        if (peak > 0.01) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const peak = Math.max(
        ...Array.from(inspector.getValues(), (value) => Math.abs(value)),
      );

      multiprocessEngine.dispose();

      expect(peak).toBeGreaterThan(0.01);
    },
    10000,
  );

  it(
    "produces master output end-to-end with a real spawned sequencer worker",
    async () => {
      const document = createDefaultInstrumentDocument();
      const firstTrack = document.tracks[0];
      if (!firstTrack) {
        throw new Error("Expected default instrument to include a first track");
      }

      document.tracks = document.tracks.map((track, index) =>
        index === 0
          ? {
              ...firstTrack,
              enabled: true,
              noteSource: "stepSequencer",
              sourceProfileId: "osc",
              sequencer: {
                ...firstTrack.sequencer,
                pages: firstTrack.sequencer.pages.map((page, pageIndex) => ({
                  ...page,
                  steps: page.steps.map((step, stepIndex) =>
                    pageIndex === 0 && stepIndex === 0
                      ? {
                          ...step,
                          active: true,
                          notes: [{ note: "C3", velocity: 100 }],
                        }
                      : step,
                  ),
                })),
              },
            }
          : {
              ...track,
              enabled: false,
            },
      );

      const session = createInstrumentSession(document);
      let parentEngine:
        | Awaited<ReturnType<typeof loadInstrumentEngineWithContext>>
        | undefined;
      const workers: ReturnType<typeof fork>[] = [];

      try {
        const multiprocessEngine = await createMultiprocessInstrumentEngine(
          document,
          session,
          {
            loadParentEngine: async (patch) => {
              parentEngine = await loadInstrumentEngineWithContext(patch);
              return parentEngine;
            },
            spawnWorker: (spec) => {
              const workerPath = fileURLToPath(
                new URL("../src/multiprocessTrackWorker.ts", import.meta.url),
              );
              const worker = fork(workerPath, [], {
                execArgv: ["--import", "tsx"],
                stdio: ["ignore", "ignore", "ignore", "ipc"],
              });
              (worker as { trackKey?: string }).trackKey = spec.trackKey;
              workers.push(worker);
              return worker as never;
            },
          },
        );

        if (!parentEngine) {
          throw new Error("Expected parent engine to be captured");
        }

        parentEngine.addModule({
          id: "test.inspector.e2e",
          name: "Inspector",
          moduleType: ModuleType.Inspector,
          voiceNo: 0,
          props: {},
          inputs: [],
          outputs: [],
        });

        const inspector = parentEngine.findModule("test.inspector.e2e") as {
          audioNode: AudioNode;
          getValues: () => Float32Array;
        };

        const masterVolumeOutput = parentEngine.findIO(
          session.runtime.masterVolumeId,
          "out",
          "output",
        );
        getAudioNodesForTest(masterVolumeOutput).forEach((node) => {
          node.connect(inspector.audioNode);
        });

        await multiprocessEngine.start();

        const startedAt = Date.now();
        let peak = 0;
        while (Date.now() - startedAt < 8000) {
          peak = Math.max(
            ...Array.from(inspector.getValues(), (value) => Math.abs(value)),
          );
          if (peak > 0.01) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        multiprocessEngine.dispose();

        expect(peak).toBeGreaterThan(0.01);
      } finally {
        workers.forEach((worker) => {
          worker.kill();
        });
      }
    },
    15000,
  );
});
