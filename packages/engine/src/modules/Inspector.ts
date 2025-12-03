import { Context } from "@blibliki/utils";
import { AnalyserNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module, SetterHooks } from "@/core";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IInspector = IModule<ModuleType.Inspector>;
export type IInspectorProps = {
  fftSize: number;
};

export const inspectorPropSchema: ModulePropSchema<
  IInspectorProps,
  {
    fftSize: EnumProp<number>;
  }
> = {
  fftSize: {
    kind: "enum",
    options: [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768],
    label: "FFT size",
  },
};

const DEFAULT_PROPS: IInspectorProps = { fftSize: 512 };

export default class Inspector
  extends Module<ModuleType.Inspector>
  implements Pick<SetterHooks<IInspectorProps>, "onAfterSetFftSize">
{
  declare audioNode: AnalyserNode;
  private _buffer?: Float32Array<ArrayBuffer>;

  constructor(engineId: string, params: ICreateModule<ModuleType.Inspector>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new AnalyserNode(context.audioContext);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs("in");
  }

  onAfterSetFftSize: SetterHooks<IInspectorProps>["onAfterSetFftSize"] = (
    value,
  ) => {
    this._buffer = new Float32Array(value);
  };

  get buffer() {
    if (this._buffer) return this._buffer;

    this._buffer = new Float32Array(this.props.fftSize);

    return this._buffer;
  }

  getValue(): number {
    return this.getValues()[0];
  }

  getValues(): Float32Array {
    this.audioNode.getFloatTimeDomainData(this.buffer);

    return this.buffer;
  }
}
