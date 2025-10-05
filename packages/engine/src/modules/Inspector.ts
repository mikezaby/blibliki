import { IAnyAudioContext, IModule, Module } from "@/core";
import { PropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IInspector = IModule<ModuleType.Inspector>;
export type IInspectorProps = {
  fftSize: number;
};

export const inspectorPropSchema: PropSchema<IInspectorProps> = {
  fftSize: {
    kind: "enum",
    options: [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768],
    label: "FFT size",
  },
};

const DEFAULT_PROPS: IInspectorProps = { fftSize: 512 };

export default class Inspector extends Module<ModuleType.Inspector> {
  declare audioNode: AnalyserNode;
  private _buffer?: Float32Array<ArrayBuffer>;

  constructor(engineId: string, params: ICreateModule<ModuleType.Inspector>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: IAnyAudioContext) =>
      new AnalyserNode(context);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs("in");
  }

  protected onSetFftSize(value: number) {
    this._buffer = new Float32Array(value);
  }

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
