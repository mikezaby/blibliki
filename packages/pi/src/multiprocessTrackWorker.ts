import {
  createMultiprocessTrackWorkerController,
  type MultiprocessTrackWorkerEvent,
  type MultiprocessTrackWorkerMessage,
} from "@/multiprocessInstrumentEngine";
import type { PcmChunkMessage } from "@/multiprocessAudioBridge";

function toUint8Array(channel: PcmChunkMessage["channels"][number]) {
  if (channel instanceof ArrayBuffer) {
    return new Uint8Array(channel);
  }

  if (ArrayBuffer.isView(channel)) {
    return new Uint8Array(
      channel.buffer.slice(channel.byteOffset, channel.byteOffset + channel.byteLength),
    );
  }

  return Uint8Array.from(channel.data);
}

function sendMessage(message: MultiprocessTrackWorkerEvent) {
  if (typeof process.send === "function" && process.connected) {
    try {
      if (message.type === "pcm-chunk") {
        process.send({
          ...message,
          channels: message.channels.map((channel) =>
            Buffer.from(toUint8Array(channel)),
          ),
        } satisfies MultiprocessTrackWorkerEvent);
        return;
      }

      process.send(message);
    } catch {
      // Parent may have exited while worker was still flushing PCM.
    }
  }
}

const controller = createMultiprocessTrackWorkerController({
  sendMessage,
});

let queue = Promise.resolve(false);

process.on("message", (message: MultiprocessTrackWorkerMessage) => {
  queue = queue
    .then(async (shouldExit) => {
      if (shouldExit) {
        return true;
      }

      return controller.handleMessage(message);
    })
    .then((shouldExit) => {
      if (shouldExit) {
        process.exit(0);
      }

      return shouldExit;
    })
    .catch((error: unknown) => {
      sendMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });

      return false;
    });
});
