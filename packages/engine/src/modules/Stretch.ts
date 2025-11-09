import { ContextTime, Seconds } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SignalsmithStretch from "signalsmith-stretch";
import { IModule, Module } from "@/core";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IStretch = IModule<ModuleType.Stretch>;
export type IStretchProps = {
  rate: number;
  semitones: number;
};

export const stretchPropSchema: ModulePropSchema<IStretchProps> = {
  rate: {
    kind: "number",
    min: 0,
    max: 10,
    step: 0.01,
    label: "Rate",
  },
  semitones: {
    kind: "number",
    min: -82,
    max: 82,
    step: 1,
    label: "Semitones",
  },
};

type StretchScheduleProps = {
  output: Seconds;
  active: boolean;
  input: Seconds;
  rate: number;
  semitones: number;
  tonalityHz: number;
  loopStart: Seconds;
  loopEnd: Seconds;
};

type StretchNode = AudioNode & {
  start: (t: number) => void;
  stop: (t: number) => void;
  schedule: (props: Partial<StretchScheduleProps>) => void;
};

const DEFAULT_PROPS: IStretchProps = { rate: 1, semitones: 0 };

export class MonoStretch extends Module<ModuleType.Stretch> {
  declare audioNode: GainNode; // Using GainNode as a placeholder
  stretchNode?: StretchNode;
  isStated = false;

  constructor(engineId: string, params: ICreateModule<ModuleType.Stretch>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new GainNode(context.audioContext);

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    void this.initializeStrech();

    this.registerInputs();
    this.registerOutputs();
  }

  start(time: ContextTime) {
    if (!this.stretchNode) return;
    if (this.isStated) return;

    this.isStated = true;
    this.stretchNode.start(time);
  }

  stop(time: ContextTime) {
    if (!this.stretchNode) return;
    if (!this.isStated) return;

    this.stretchNode.stop(time);
    this.isStated = false;
  }

  protected onSetRate(value: IStretchProps["rate"]) {
    if (!this.stretchNode) return;

    this.stretchNode.schedule({ rate: value });
  }

  protected onSetSemitones(value: IStretchProps["semitones"]) {
    if (!this.stretchNode) return;

    this.stretchNode.schedule({ semitones: value });
  }

  private async initializeStrech() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.stretchNode = (await SignalsmithStretch(
      this.context.audioContext,
    )) as StretchNode;
  }

  private registerInputs() {
    this.registerAudioInput({
      name: "in",
      getAudioNode: () => {
        if (!this.stretchNode) throw Error("Try to connect before initialized");

        return this.stretchNode;
      },
    });
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => {
        if (!this.stretchNode) throw Error("Try to connect before initialized");

        return this.stretchNode;
      },
    });
  }
}

export default class Stretch extends PolyModule<ModuleType.Stretch> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Stretch>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Stretch>,
    ) => new MonoStretch(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }

  start(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.start(time);
    });
  }

  stop(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.stop(time);
    });
  }
}
