import { Context } from "@blibliki/utils";
import {
  AnalyserNode,
  ConstantSourceNode,
} from "@blibliki/utils/web-audio-api";
import { describe, expect, it } from "vitest";
import {
  createPcmExportNode,
  loadMultiprocessAudioBridgeProcessors,
  type PcmChunkMessage,
} from "@/multiprocessAudioBridge";

function getChunkPeak(message: PcmChunkMessage | undefined) {
  if (!message) {
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
    ...message.channels.flatMap((buffer) =>
      Array.from(
        new Float32Array(toArrayBuffer(buffer)),
        (value) => Math.abs(value),
      ),
    ),
  );
}

function getAnalyserPeak(analyser: AnalyserNode) {
  const values = new Float32Array(512);
  analyser.getFloatTimeDomainData(values);

  return Math.max(...Array.from(values, (value) => Math.abs(value)));
}

describe("multiprocessAudioBridge", () => {
  it(
    "exports non-zero pcm chunks from a non-zero input signal",
    async () => {
      const context = new Context();

      try {
        await loadMultiprocessAudioBridgeProcessors(context);

        const exportNode = createPcmExportNode(context);
        const analyser = new AnalyserNode(context.audioContext);
        const constant = new ConstantSourceNode(context.audioContext, {
          offset: 0.25,
        });
        let chunk: PcmChunkMessage | undefined;

        exportNode.port.onmessage = (event: MessageEvent<PcmChunkMessage>) => {
          chunk = event.data;
        };

        constant.connect(exportNode);
        exportNode.connect(analyser);
        analyser.connect(context.destination);

        constant.start();
        await context.resume();

        const startedAt = Date.now();
        while (!chunk && Date.now() - startedAt < 5000) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        expect(getAnalyserPeak(analyser)).toBeGreaterThan(0.01);
        expect(getChunkPeak(chunk)).toBeGreaterThan(0.01);

        constant.stop();
        constant.disconnect();
        exportNode.disconnect();
        analyser.disconnect();
      } finally {
        await context.close();
      }
    },
    10000,
  );

  it(
    "exports non-zero pcm chunks when connected directly to destination",
    async () => {
      const context = new Context();

      try {
        await loadMultiprocessAudioBridgeProcessors(context);

        const exportNode = createPcmExportNode(context);
        const constant = new ConstantSourceNode(context.audioContext, {
          offset: 0.25,
        });
        let chunk: PcmChunkMessage | undefined;

        exportNode.port.onmessage = (event: MessageEvent<PcmChunkMessage>) => {
          chunk = event.data;
        };

        constant.connect(exportNode);
        exportNode.connect(context.destination);

        constant.start();
        await context.resume();

        const startedAt = Date.now();
        while (!chunk && Date.now() - startedAt < 5000) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        expect(getChunkPeak(chunk)).toBeGreaterThan(0.01);

        constant.stop();
        constant.disconnect();
        exportNode.disconnect();
      } finally {
        await context.close();
      }
    },
    10000,
  );
});
