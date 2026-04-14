import { Context } from "@blibliki/utils";
import { AudioWorkletNode } from "@blibliki/utils/web-audio-api";

const PCM_EXPORT_PROCESSOR_NAME = "blibliki-pcm-export-processor";
const PCM_IMPORT_PROCESSOR_NAME = "blibliki-pcm-import-processor";
const DEFAULT_PCM_CHUNK_FRAMES = 512;
const DEFAULT_CHANNEL_COUNT = 2;

export type PcmChunkMessage = {
  type: "pcm-chunk";
  channels: (
    | ArrayBuffer
    | Uint8Array
    | {
        type: "Buffer";
        data: number[];
      }
  )[];
  frames: number;
};

export type PcmImportNode = AudioWorkletNode & {
  enqueue: (message: PcmChunkMessage) => void;
};

const pcmExportProcessorSource = `
const PROCESSOR_NAME = "${PCM_EXPORT_PROCESSOR_NAME}";
const CHANNEL_COUNT = ${DEFAULT_CHANNEL_COUNT};
const CHUNK_FRAMES = ${DEFAULT_PCM_CHUNK_FRAMES};

class PcmExportProcessor extends AudioWorkletProcessor {
  chunkFrames = CHUNK_FRAMES;
  chunkBuffers = Array.from(
    { length: CHANNEL_COUNT },
    () => new Float32Array(CHUNK_FRAMES),
  );
  chunkOffset = 0;

  constructor(options) {
    super();

    const processorOptions = options?.processorOptions;
    const nextChunkFrames = Number(
      processorOptions &&
        typeof processorOptions === "object" &&
        "chunkFrames" in processorOptions
        ? processorOptions.chunkFrames
        : CHUNK_FRAMES,
    );

    if (Number.isFinite(nextChunkFrames) && nextChunkFrames > 0) {
      this.chunkFrames = Math.max(128, Math.floor(nextChunkFrames));
      this.chunkBuffers = Array.from(
        { length: CHANNEL_COUNT },
        () => new Float32Array(this.chunkFrames),
      );
    }
  }

  flushChunk() {
    if (this.chunkOffset <= 0) {
      return;
    }

    const channels = this.chunkBuffers.map((channelBuffer) => {
      const chunk = channelBuffer.slice(0, this.chunkOffset);
      return chunk.buffer;
    });
    const message = {
      type: "pcm-chunk",
      channels,
      frames: this.chunkOffset,
    };

    this.port.postMessage(message, channels);
    this.chunkOffset = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    const frameCount = output?.[0]?.length ?? input?.[0]?.length ?? 0;

    for (let frame = 0; frame < frameCount; frame += 1) {
      for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
        const inputChannel = input?.[channel] ?? input?.[0];
        const outputChannel = output?.[channel] ?? output?.[0];
        const sample = inputChannel?.[frame] ?? 0;
        if (outputChannel) {
          outputChannel[frame] = sample;
        }

        const channelBuffer = this.chunkBuffers[channel];
        if (channelBuffer) {
          channelBuffer[this.chunkOffset] = sample;
        }
      }

      this.chunkOffset += 1;
      if (this.chunkOffset >= this.chunkFrames) {
        this.flushChunk();
      }
    }

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, PcmExportProcessor);
`;

const pcmImportProcessorSource = `
const PROCESSOR_NAME = "${PCM_IMPORT_PROCESSOR_NAME}";
const CHANNEL_COUNT = ${DEFAULT_CHANNEL_COUNT};

class PcmImportProcessor extends AudioWorkletProcessor {
  queue = [];
  currentChunk = undefined;
  currentFrameOffset = 0;

  constructor() {
    super();

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      const message = data;
      if (message.type !== "pcm-chunk" || !Array.isArray(message.channels)) {
        return;
      }

      const chunk = Array.from({ length: CHANNEL_COUNT }, (_, channel) => {
        const buffer = message.channels?.[channel];
        if (buffer instanceof ArrayBuffer) {
          return new Float32Array(buffer);
        }

        if (ArrayBuffer.isView(buffer)) {
          return new Float32Array(
            buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength,
            ),
          );
        }

        if (
          buffer &&
          typeof buffer === "object" &&
          "type" in buffer &&
          "data" in buffer &&
          buffer.type === "Buffer" &&
          Array.isArray(buffer.data)
        ) {
          return new Float32Array(Uint8Array.from(buffer.data).buffer);
        }

        if (!(buffer instanceof ArrayBuffer)) {
          return new Float32Array(0);
        }
      });

      this.queue.push(chunk);
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output) {
      return true;
    }

    const frameCount = output[0]?.length ?? 0;
    for (let frame = 0; frame < frameCount; frame += 1) {
      if (
        !this.currentChunk ||
        this.currentFrameOffset >= (this.currentChunk[0]?.length ?? 0)
      ) {
        this.currentChunk = this.queue.shift();
        this.currentFrameOffset = 0;
      }

      for (let channel = 0; channel < output.length; channel += 1) {
        const outputChannel = output[channel];
        if (!outputChannel) {
          continue;
        }

        outputChannel[frame] =
          this.currentChunk?.[channel]?.[this.currentFrameOffset] ??
          this.currentChunk?.[0]?.[this.currentFrameOffset] ??
          0;
      }

      this.currentFrameOffset += 1;
    }

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, PcmImportProcessor);
`;

export const pcmExportProcessorURL = URL.createObjectURL(
  new Blob([pcmExportProcessorSource], { type: "application/javascript" }),
);

export const pcmImportProcessorURL = URL.createObjectURL(
  new Blob([pcmImportProcessorSource], { type: "application/javascript" }),
);

export async function loadMultiprocessAudioBridgeProcessors(context: Context) {
  await context.addModule(pcmExportProcessorURL);
  await context.addModule(pcmImportProcessorURL);
}

export function createPcmExportNode(
  context: Context,
  options: {
    channelCount?: number;
    chunkFrames?: number;
  } = {},
) {
  return new AudioWorkletNode(context.audioContext, PCM_EXPORT_PROCESSOR_NAME, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [options.channelCount ?? DEFAULT_CHANNEL_COUNT],
    channelCount: options.channelCount ?? DEFAULT_CHANNEL_COUNT,
    processorOptions: {
      chunkFrames: options.chunkFrames ?? DEFAULT_PCM_CHUNK_FRAMES,
    },
  });
}

export function createPcmImportNode(
  context: Context,
  options: {
    channelCount?: number;
  } = {},
): PcmImportNode {
  const node = new AudioWorkletNode(
    context.audioContext,
    PCM_IMPORT_PROCESSOR_NAME,
    {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [options.channelCount ?? DEFAULT_CHANNEL_COUNT],
      channelCount: options.channelCount ?? DEFAULT_CHANNEL_COUNT,
    },
  ) as PcmImportNode;

  node.enqueue = (message: PcmChunkMessage) => {
    node.port.postMessage(message);
  };

  return node;
}
