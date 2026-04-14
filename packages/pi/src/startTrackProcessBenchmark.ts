import { createDefaultPlayableInstrumentDocument } from "@blibliki/instrument";
import {
  createTrackProcessBenchmark,
  type CreateTrackProcessBenchmarkOptions,
  type TrackProcessBenchmark,
} from "@/trackProcessBenchmark";

export type StartTrackProcessBenchmarkDependencies = {
  createTrackProcessBenchmark?: typeof createTrackProcessBenchmark;
  waitForShutdown?: typeof waitForShutdown;
  log?: (message: string) => void;
};

async function waitForShutdown(
  _benchmark: TrackProcessBenchmark,
  onShutdown?: () => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const shutdown = (signal: string) => {
      console.log(`\nStopping track process benchmark (${signal})...`);
      onShutdown?.();
      process.off("SIGINT", onSigInt);
      process.off("SIGTERM", onSigTerm);
      resolve();
    };

    const onSigInt = () => {
      shutdown("SIGINT");
    };
    const onSigTerm = () => {
      shutdown("SIGTERM");
    };

    process.on("SIGINT", onSigInt);
    process.on("SIGTERM", onSigTerm);
  });
}

export async function startTrackProcessBenchmark(
  options: CreateTrackProcessBenchmarkOptions = {},
  dependencies: StartTrackProcessBenchmarkDependencies = {},
): Promise<void> {
  const log = dependencies.log ?? console.log;
  const document = createDefaultPlayableInstrumentDocument();
  const benchmark = (
    dependencies.createTrackProcessBenchmark ?? createTrackProcessBenchmark
  )(document, options);

  log("=== Blibliki Pi Track Process Benchmark ===");
  benchmark.start();
  log(
    `Started track process benchmark with ${benchmark.specs.length} track workers`,
  );
  log("Press Ctrl+C to stop.");

  await (dependencies.waitForShutdown ?? waitForShutdown)(benchmark, () => {
    benchmark.dispose();
  });
}
