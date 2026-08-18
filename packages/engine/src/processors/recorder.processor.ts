import type {
  ProcessorDefinition,
  ProcessorMessageHandler,
  ProcessFunction,
  ProcessorState,
} from "@blibliki/utils";

// Inline recorder, unified model: passes audio through and captures a precise
// [start, stop] window, flushing chunks to the module via ctx.post; receives
// start/stop/cancel via onMessage. One top-level process + createState +
// onMessage, each self-contained. onMessage has no sampleRate, so start/stop
// times are stored as seconds and converted to frames in process.
type RecorderState = {
  startAt: number | null;
  stopAt: number | null;
  recording: boolean;
  channelCount: number;
  buffers: Float32Array[][];
  pendingFrames: number;
};

const createRecorderState = (): ProcessorState =>
  ({
    startAt: null,
    stopAt: null,
    recording: false,
    channelCount: 0,
    buffers: [],
    pendingFrames: 0,
  }) satisfies RecorderState;

const recorderOnMessage: ProcessorMessageHandler = (data, state) => {
  if (!data || typeof data !== "object") return;
  const message = data as { type?: unknown; at?: unknown };
  const s = state as RecorderState;

  switch (message.type) {
    case "start":
      s.startAt = Number(message.at);
      s.stopAt = null;
      s.recording = false;
      s.channelCount = 0;
      s.buffers = [];
      s.pendingFrames = 0;
      break;
    case "stop":
      s.stopAt = Number(message.at);
      break;
    case "cancel":
      s.startAt = null;
      s.stopAt = null;
      s.recording = false;
      s.channelCount = 0;
      s.buffers = [];
      s.pendingFrames = 0;
      break;
  }
};

const recorderProcess: ProcessFunction = (
  inputs,
  outputs,
  framesToProcess,
  _params,
  state,
  ctx,
) => {
  // Flush captured audio roughly every ~0.18s (at 44.1k) to avoid ~375
  // posts/sec and keep the worklet's own memory low.
  const FLUSH_FRAMES = 8192;
  const sampleRate = ctx.sampleRate;
  const s = state as RecorderState;

  const input = inputs;
  const output = outputs;

  // Passthrough so the recorder can sit inline / be monitored.
  if (input.length && output.length) {
    for (let ch = 0; ch < output.length; ch++) {
      const src = input[ch] ?? input[0];
      const dst = output[ch];
      if (src && dst) dst.set(src);
    }
  }

  if (s.startAt === null) return;

  const startFrame = Math.round(s.startAt * sampleRate);
  const stopFrame =
    s.stopAt === null ? null : Math.round(s.stopAt * sampleRate);

  const blockStart = ctx.currentFrame;
  const blockLen = input[0] ? input[0].length : framesToProcess;

  // Still before the precise start sample.
  if (blockStart + blockLen <= startFrame) return;

  const localStart = Math.max(0, startFrame - blockStart);
  let localEnd = blockLen;
  let finished = false;
  if (stopFrame !== null && stopFrame <= blockStart + blockLen) {
    localEnd = Math.max(localStart, stopFrame - blockStart);
    finished = true;
  }

  if (!s.recording) {
    s.recording = true;
    s.channelCount = Math.max(1, input.length ? input.length : 1);
    s.buffers = Array.from({ length: s.channelCount }, () => []);
  }

  if (input.length && localEnd > localStart) {
    for (let ch = 0; ch < s.channelCount; ch++) {
      const src = input[ch] ?? input[0];
      if (src) s.buffers[ch]!.push(src.slice(localStart, localEnd));
    }
    s.pendingFrames += localEnd - localStart;
  }

  if (finished || s.pendingFrames >= FLUSH_FRAMES) {
    if (s.pendingFrames > 0) {
      const length = s.pendingFrames;
      const channels = s.buffers.map((chunks) => {
        const out = new Float32Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          out.set(chunk, offset);
          offset += chunk.length;
        }
        return out;
      });
      ctx.post(
        { type: "chunk", channels },
        channels.map((c) => c.buffer),
      );
      s.buffers = s.buffers.map(() => []);
      s.pendingFrames = 0;
    }

    if (finished) {
      ctx.post({ type: "done", sampleRate });
      s.startAt = null;
      s.stopAt = null;
      s.recording = false;
      s.channelCount = 0;
      s.buffers = [];
      s.pendingFrames = 0;
    }
  }
};

const recorderProcessor: ProcessorDefinition = {
  name: "recorder-processor",
  parameterDescriptors: [],
  process: recorderProcess,
  createState: createRecorderState,
  onMessage: recorderOnMessage,
};

export default recorderProcessor;
