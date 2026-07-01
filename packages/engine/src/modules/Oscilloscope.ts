import { Context } from "@blibliki/utils";
import { AnalyserNode } from "@blibliki/utils/web-audio-api";
import { IModule, SetterHooks } from "@/core";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";
import AnalyserModule from "./AnalyserModule";

export type IOscilloscope = IModule<ModuleType.Oscilloscope>;
export type IOscilloscopeProps = {
  fftSize: number;
};

export const oscilloscopePropSchema: ModulePropSchema<
  IOscilloscopeProps,
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
};

const DEFAULT_PROPS: IOscilloscopeProps = { fftSize: 1024 };

export default class Oscilloscope
  extends AnalyserModule<ModuleType.Oscilloscope>
  implements Pick<SetterHooks<IOscilloscopeProps>, "onAfterSetFftSize">
{
  declare audioNode: AnalyserNode;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.Oscilloscope>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) => {
      const audioNode = new AnalyserNode(context.audioContext);
      audioNode.fftSize = props.fftSize;

      return audioNode;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs("in");
  }

  onAfterSetFftSize: SetterHooks<IOscilloscopeProps>["onAfterSetFftSize"] = (
    value,
  ) => {
    this.audioNode.fftSize = value;
  };
}
