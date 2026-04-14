import { describe, expect, it, vi } from "vitest";
import type { StartTrackProcessBenchmarkDependencies } from "@/startTrackProcessBenchmark";
import { startTrackProcessBenchmark } from "@/startTrackProcessBenchmark";
import type { TrackProcessBenchmark } from "@/trackProcessBenchmark";

describe("startTrackProcessBenchmark", () => {
  it("creates the benchmark runtime, starts it, and disposes it on shutdown", async () => {
    const start = vi.fn();
    const dispose = vi.fn();
    const benchmark: TrackProcessBenchmark = {
      specs: [
        {
          trackKey: "track-1",
          trackName: "track-1",
          midiChannel: 1,
          benchmarkMidiId: "track-1.runtime.benchmarkMidi",
          benchmarkNote: "C3",
          patch: {
            bpm: 120,
            timeSignature: [4, 4],
            modules: [],
            routes: [],
          },
        },
        {
          trackKey: "track-2",
          trackName: "track-2",
          midiChannel: 2,
          benchmarkMidiId: "track-2.runtime.benchmarkMidi",
          benchmarkNote: "C3",
          patch: {
            bpm: 120,
            timeSignature: [4, 4],
            modules: [],
            routes: [],
          },
        },
      ],
      workers: new Map(),
      start,
      stop: vi.fn(),
      setBpm: vi.fn(),
      dispose,
    };
    const createTrackProcessBenchmark = vi.fn<
      NonNullable<
        StartTrackProcessBenchmarkDependencies["createTrackProcessBenchmark"]
      >
    >(() => benchmark);
    const waitForShutdown = vi.fn<
      NonNullable<StartTrackProcessBenchmarkDependencies["waitForShutdown"]>
    >((_benchmark, onShutdown) => {
      onShutdown?.();
      return Promise.resolve();
    });
    const log = vi.fn();

    await startTrackProcessBenchmark(
      {
        bpm: 96,
      },
      {
        createTrackProcessBenchmark,
        waitForShutdown,
        log,
      },
    );

    const [document, options] = createTrackProcessBenchmark.mock.calls[0] ?? [];

    expect(document?.tracks[0]?.key).toBe("track-1");
    expect(options).toEqual({ bpm: 96 });
    expect(start).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(waitForShutdown).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Track Process Benchmark"),
    );
  });
});
