import { Context } from "@blibliki/utils";
import { AnalyserNode } from "@blibliki/utils/web-audio-api";
import { IModule, SetterHooks } from "@/core";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";
import AnalyserModule from "./AnalyserModule";

export type ISpectrum = IModule<ModuleType.Spectrum>;
export type ISpectrumProps = {
  fftSize: number;
  minDecibels: number;
  maxDecibels: number;
  smoothing: number;
};

export const spectrumPropSchema: ModulePropSchema<
  ISpectrumProps,
  {
    fftSize: EnumProp<number>;
  }
> = {
  fftSize: {
    kind: "enum",
    options: [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768],
    label: "FFT size",
    shortLabel: "size",
  },
  minDecibels: {
    kind: "number",
    min: -150,
    max: -50,
    step: 1,
    label: "Min dB",
    shortLabel: "min",
  },
  maxDecibels: {
    kind: "number",
    min: -50,
    max: 0,
    step: 1,
    label: "Max dB",
    shortLabel: "max",
  },
  smoothing: {
    kind: "number",
    min: 0,
    max: 0.99,
    step: 0.01,
    label: "Smoothing",
    shortLabel: "smooth",
  },
};

const DEFAULT_PROPS: ISpectrumProps = {
  fftSize: 2048,
  minDecibels: -100,
  maxDecibels: -30,
  smoothing: 0.8,
};

export default class Spectrum
  extends AnalyserModule<ModuleType.Spectrum>
  implements
    Pick<
      SetterHooks<ISpectrumProps>,
      | "onAfterSetFftSize"
      | "onAfterSetMinDecibels"
      | "onAfterSetMaxDecibels"
      | "onAfterSetSmoothing"
    >
{
  declare audioNode: AnalyserNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Spectrum>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) => {
      const audioNode = new AnalyserNode(context.audioContext);
      audioNode.fftSize = props.fftSize;
      audioNode.minDecibels = props.minDecibels;
      audioNode.maxDecibels = props.maxDecibels;
      audioNode.smoothingTimeConstant = props.smoothing;

      return audioNode;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs("in");
  }

  onAfterSetFftSize: SetterHooks<ISpectrumProps>["onAfterSetFftSize"] = (
    value,
  ) => {
    this.audioNode.fftSize = value;
  };

  onAfterSetMinDecibels: SetterHooks<ISpectrumProps>["onAfterSetMinDecibels"] =
    (value) => {
      this.audioNode.minDecibels = value;
    };

  onAfterSetMaxDecibels: SetterHooks<ISpectrumProps>["onAfterSetMaxDecibels"] =
    (value) => {
      this.audioNode.maxDecibels = value;
    };

  onAfterSetSmoothing: SetterHooks<ISpectrumProps>["onAfterSetSmoothing"] = (
    value,
  ) => {
    this.audioNode.smoothingTimeConstant = value;
  };
}
