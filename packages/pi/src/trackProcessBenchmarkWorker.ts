import {
  createTrackProcessBenchmarkWorkerController,
  type TrackProcessBenchmarkWorkerMessage,
} from "@/trackProcessBenchmark";

const controller = createTrackProcessBenchmarkWorkerController({
  sendMessage: (message) => {
    if (typeof process.send === "function") {
      process.send(message);
    }
  },
});

process.on("message", (message) => {
  void controller
    .handleMessage(message as TrackProcessBenchmarkWorkerMessage)
    .then((shouldExit) => {
      if (shouldExit) {
        process.exit(0);
      }
    });
});

process.on("disconnect", () => {
  process.exit(0);
});
