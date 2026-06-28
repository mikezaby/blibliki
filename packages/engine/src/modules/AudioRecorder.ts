import { ContextTime, TPB, TransportState } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { IModule, Module } from "@/core";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";

export type IAudioRecorder = IModule<ModuleType.AudioRecorder>;

export type Quantize = "free" | "beat" | "bar";

export type IAudioRecorderProps = {
  quantize: Quantize;
};

export type IAudioRecorderState = {
  isRecording: boolean;
  durationSeconds: number;
};

export const audioRecorderPropSchema: ModulePropSchema<
  IAudioRecorderProps,
  { quantize: EnumProp<Quantize> }
> = {
  quantize: {
    kind: "enum",
    label: "Quantize",
    shortLabel: "q",
    options: ["free", "beat", "bar"],
  },
};

const DEFAULT_PROPS: IAudioRecorderProps = { quantize: "bar" };

const DEFAULT_STATE: IAudioRecorderState = {
  isRecording: false,
  durationSeconds: 0,
};

type ChunkMessage = { type: "chunk"; channels: Float32Array[] };
type DoneMessage = { type: "done"; sampleRate: number };

/**
 * Round a tick position up to the next quantize boundary.
 * Pure so it can be unit-tested without a worklet.
 */
export function nextQuantizedTick(
  currentTicks: number,
  quantize: Quantize,
  ticksPerBar: number,
): number {
  if (quantize === "free") return currentTicks;
  const grid = quantize === "bar" ? ticksPerBar : TPB; // TPB == one beat
  if (currentTicks % grid === 0) return currentTicks;
  return Math.ceil(currentTicks / grid) * grid;
}

/**
 * Encode Float32 PCM channels into a 16-bit PCM WAV Blob.
 * Pure standalone helper, reused by every recorder variant.
 */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = Math.max(1, channels.length);
  const numFrames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch]?.[frame] ?? 0));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export default class AudioRecorder extends Module<ModuleType.AudioRecorder> {
  declare audioNode: AudioWorkletNode;

  /** Set by the host to receive the finished recording. */
  onRecordingComplete?: (blob: Blob) => void;

  private chunks: Float32Array[][] = [];
  private capturedFrames = 0;
  private armedForTransport = false;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.AudioRecorder>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      newAudioWorklet(context, CustomWorklet.RecorderProcessor);

    super(engineId, { ...params, props, audioNodeConstructor });

    this._state = { ...DEFAULT_STATE };
    this.audioNode.port.onmessage = this.onWorkletMessage;

    // Audio in + passthrough out (both reference the worklet node).
    this.registerAudioInput({ name: "in", getAudioNode: () => this.audioNode });
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.audioNode,
    });
  }

  /** Begin recording. Quantized to the next boundary if the transport is playing. */
  record() {
    this.chunks = [];
    this.capturedFrames = 0;

    if (this.engine.transport.state === TransportState.playing) {
      this.armedForTransport = false;
      this.postStart(this.quantizedStartTime());
    } else {
      // Armed: starts sample-accurately from the contextTime passed to start().
      this.armedForTransport = true;
    }

    this.state = { isRecording: true, durationSeconds: 0 };
    this.triggerPropsUpdate();
  }

  stopRecording() {
    if (this.armedForTransport) {
      this.armedForTransport = false;
      this.audioNode.port.postMessage({ type: "cancel" });
      this.state = { isRecording: false };
      this.triggerPropsUpdate();
      return;
    }
    // ponytail: stop is immediate; quantized stop is future work.
    this.postStop(this.context.currentTime);
  }

  // Transport started — fire an armed recording at the precise context time.
  start(contextTime: ContextTime): void {
    if (!this.armedForTransport) return;
    this.armedForTransport = false;
    this.postStart(contextTime);
  }

  // Transport stopped — stop an in-progress recording.
  stop(contextTime: ContextTime): void {
    if (!this.state.isRecording) return;
    this.postStop(contextTime);
  }

  private get quantize(): Quantize {
    return this.props.quantize;
  }

  private quantizedStartTime(): ContextTime {
    if (this.quantize === "free") return this.context.currentTime;

    const { transport } = this.engine;
    const ticksPerBar = TPB * transport.timeSignature[0];
    const currentTicks = transport.getTicksAtContextTime(
      this.context.currentTime,
    );
    const targetTicks = nextQuantizedTick(
      currentTicks,
      this.quantize,
      ticksPerBar,
    );
    return transport.getContextTimeAtTicks(targetTicks);
  }

  private postStart(at: ContextTime) {
    this.audioNode.port.postMessage({ type: "start", at });
  }

  private postStop(at: ContextTime) {
    this.audioNode.port.postMessage({ type: "stop", at });
  }

  private onWorkletMessage = (
    event: MessageEvent<ChunkMessage | DoneMessage>,
  ) => {
    const data = event.data;
    if (data.type === "chunk") {
      this.chunks.push(data.channels);
      this.capturedFrames += data.channels[0]?.length ?? 0;
      this.state = {
        durationSeconds:
          this.capturedFrames / this.context.audioContext.sampleRate,
      };
      this.triggerPropsUpdate();
    } else {
      this.finishRecording(data.sampleRate);
    }
  };

  private finishRecording(sampleRate: number) {
    this.state = { isRecording: false };
    this.triggerPropsUpdate();
    if (this.chunks.length === 0) return;

    const numChannels = this.chunks[0]!.length;
    const channels = Array.from({ length: numChannels }, (_, ch) =>
      concatFloat32(
        this.chunks.map((c) => c[ch]!),
        this.capturedFrames,
      ),
    );

    const blob = encodeWav(channels, sampleRate);
    this.chunks = [];
    this.capturedFrames = 0;
    this.onRecordingComplete?.(blob);
  }
}

function concatFloat32(parts: Float32Array[], length: number): Float32Array {
  const out = new Float32Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
