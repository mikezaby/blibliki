import { Context } from "@blibliki/utils";
import {
  AnalyserNode,
  ChannelSplitterNode,
} from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IVuMeter = IModule<ModuleType.VuMeter>;
export type IVuMeterProps = {
  // Meter release ballistics: 0 = instant fall, ~0.9 = slow decay. Applied in UI.
  smoothing: number;
};

export const vuMeterPropSchema: ModulePropSchema<IVuMeterProps> = {
  smoothing: {
    kind: "number",
    min: 0,
    max: 0.99,
    step: 0.01,
    label: "Smoothing",
    shortLabel: "smooth",
  },
};

const DEFAULT_PROPS: IVuMeterProps = { smoothing: 0.8 };

const peakOf = (
  analyser: AnalyserNode,
  buffer: Float32Array<ArrayBuffer>,
): number => {
  analyser.getFloatTimeDomainData(buffer);

  let peak = 0;
  for (const v of buffer) {
    const abs = Math.abs(v);
    if (abs > peak) peak = abs;
  }

  return peak;
};

export default class VuMeter extends Module<ModuleType.VuMeter> {
  declare audioNode: ChannelSplitterNode;
  private analyserL: AnalyserNode;
  private analyserR: AnalyserNode;
  private bufferL: Float32Array<ArrayBuffer>;
  private bufferR: Float32Array<ArrayBuffer>;

  constructor(engineId: string, params: ICreateModule<ModuleType.VuMeter>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    // A single AnalyserNode down-mixes to mono, so split the input into two
    // mono channels and meter each independently.
    let analyserL!: AnalyserNode;
    let analyserR!: AnalyserNode;
    const audioNodeConstructor = (context: Context) => {
      const splitter = new ChannelSplitterNode(context.audioContext, {
        numberOfOutputs: 2,
      });
      analyserL = new AnalyserNode(context.audioContext);
      analyserR = new AnalyserNode(context.audioContext);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);

      return splitter;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.analyserL = analyserL;
    this.analyserR = analyserR;
    this.bufferL = new Float32Array(analyserL.fftSize);
    this.bufferR = new Float32Array(analyserR.fftSize);

    this.registerDefaultIOs("in");
  }

  /**
   * Sample peak (max absolute value) per channel: `[left, right]`.
   * Not clamped: float signals can exceed 1.0 (0 dBFS) before the output clips.
   */
  getPeaks(): [number, number] {
    return [
      peakOf(this.analyserL, this.bufferL),
      peakOf(this.analyserR, this.bufferR),
    ];
  }
}
