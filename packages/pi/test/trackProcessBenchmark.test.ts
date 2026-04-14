import { ModuleType } from "@blibliki/engine";
import { createDefaultPlayableInstrumentDocument } from "@blibliki/instrument";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTrackProcessBenchmark,
  createTrackProcessBenchmarkWorkerController,
  createTrackProcessBenchmarkWorkerSpecs,
  type TrackProcessBenchmarkWorkerMessage,
} from "@/trackProcessBenchmark";

function createDocumentWithTwoTracks() {
  const document = createDefaultPlayableInstrumentDocument();
  document.tracks = document.tracks.slice(0, 2);
  return document;
}

function createFakeChild(pid: number) {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  const child = {
    pid,
    messages: [] as unknown[],
    killed: false,
    send(message: unknown) {
      child.messages.push(message);
      return true;
    },
    kill: vi.fn(() => {
      child.killed = true;
      return true;
    }),
    on(event: string, handler: (...args: unknown[]) => void) {
      const existing = handlers.get(event) ?? [];
      existing.push(handler);
      handlers.set(event, existing);
      return child;
    },
    emit(event: string, ...args: unknown[]) {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args);
      }
    },
  };

  return child;
}

describe("createTrackProcessBenchmarkWorkerSpecs", () => {
  it("creates one benchmark worker spec per enabled track with a virtual midi driver", () => {
    const document = createDocumentWithTwoTracks();
    const secondTrack = document.tracks[1];
    if (!secondTrack) {
      throw new Error("Expected a second track in the benchmark fixture");
    }

    document.tracks[1] = {
      ...secondTrack,
      enabled: false,
    };

    const specs = createTrackProcessBenchmarkWorkerSpecs(document, {
      benchmarkNote: "E3",
    });

    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({
      trackKey: "track-1",
      benchmarkMidiId: "track-1.runtime.benchmarkMidi",
      benchmarkNote: "E3",
    });

    const benchmarkMidiModule = specs[0]?.patch.modules.find(
      (module) => module.id === specs[0]?.benchmarkMidiId,
    );
    expect(benchmarkMidiModule).toEqual(
      expect.objectContaining({
        id: "track-1.runtime.benchmarkMidi",
        moduleType: ModuleType.VirtualMidi,
      }),
    );

    expect(
      specs[0]?.patch.modules.some(
        (module) =>
          module.id === "track-1.runtime.voiceScheduler" &&
          module.moduleType === ModuleType.VoiceScheduler,
      ),
    ).toBe(true);

    expect(specs[0]?.patch.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: {
            moduleId: "track-1.runtime.benchmarkMidi",
            ioName: "midi out",
          },
          destination: {
            moduleId: "track-1.runtime.voiceScheduler",
            ioName: "midi in",
          },
        }),
      ]),
    );
  });
});

describe("createTrackProcessBenchmark", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("spawns one worker per track and broadcasts transport and benchmark midi messages", () => {
    vi.useFakeTimers();

    const document = createDocumentWithTwoTracks();
    const children = [createFakeChild(101), createFakeChild(102)];
    const spawnWorker = vi.fn((spec: { trackKey: string }) => {
      const child = children.shift();
      if (!child) {
        throw new Error(`Missing fake child for ${spec.trackKey}`);
      }

      return child;
    });

    const benchmark = createTrackProcessBenchmark(
      document,
      {
        bpm: 120,
        benchmarkNote: "G3",
      },
      {
        spawnWorker,
        log: vi.fn(),
      },
    );

    expect(spawnWorker).toHaveBeenCalledTimes(2);

    for (const child of benchmark.workers.values()) {
      const initMessage = child.messages?.[0] as
        | TrackProcessBenchmarkWorkerMessage
        | undefined;

      expect(initMessage?.type).toBe("init");
      if (initMessage?.type !== "init") {
        throw new Error("Expected an init message");
      }

      expect(initMessage.spec.trackKey.startsWith("track-")).toBe(true);
      expect(
        initMessage.spec.benchmarkMidiId.endsWith(".runtime.benchmarkMidi"),
      ).toBe(true);
    }

    benchmark.start();

    for (const child of benchmark.workers.values()) {
      expect(child.messages).toEqual(
        expect.arrayContaining([
          { type: "setBpm", bpm: 120 },
          { type: "start" },
          { type: "noteOn", note: "G3" },
        ]),
      );
    }

    vi.advanceTimersByTime(250);

    for (const child of benchmark.workers.values()) {
      expect(child.messages).toContainEqual({ type: "noteOff", note: "G3" });
    }

    benchmark.stop();

    for (const child of benchmark.workers.values()) {
      expect(child.messages).toContainEqual({ type: "stop" });
    }

    benchmark.dispose();

    for (const child of benchmark.workers.values()) {
      expect(child.messages).toContainEqual({ type: "shutdown" });
    }
  });
});

describe("createTrackProcessBenchmarkWorkerController", () => {
  it("loads a null-sink engine and handles init, transport, midi, and shutdown messages", async () => {
    const [spec] = createTrackProcessBenchmarkWorkerSpecs(
      createDocumentWithTwoTracks(),
      {
        benchmarkNote: "A3",
      },
    );

    if (!spec) {
      throw new Error("Expected a worker spec");
    }

    const engine = {
      bpm: 0,
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      dispose: vi.fn(),
      triggerVirtualMidi: vi.fn(),
    };
    const loadEngine = vi.fn(() => Promise.resolve(engine));
    const sendMessage = vi.fn();
    const controller = createTrackProcessBenchmarkWorkerController({
      loadEngine,
      sendMessage,
    });

    await controller.handleMessage({
      type: "init",
      spec,
    });

    expect(loadEngine).toHaveBeenCalledWith(spec.patch, {
      sinkId: "none",
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: "ready",
      trackKey: spec.trackKey,
      pid: process.pid,
    });

    await controller.handleMessage({ type: "setBpm", bpm: 98 });
    expect(engine.bpm).toBe(98);

    await controller.handleMessage({ type: "start" });
    expect(engine.start).toHaveBeenCalledTimes(1);

    await controller.handleMessage({ type: "noteOn", note: "A3" });
    expect(engine.triggerVirtualMidi).toHaveBeenCalledWith(
      spec.benchmarkMidiId,
      "A3",
      "noteOn",
    );

    await controller.handleMessage({ type: "noteOff", note: "A3" });
    expect(engine.triggerVirtualMidi).toHaveBeenCalledWith(
      spec.benchmarkMidiId,
      "A3",
      "noteOff",
    );

    const shouldExit = await controller.handleMessage({ type: "shutdown" });
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(shouldExit).toBe(true);
  });
});
