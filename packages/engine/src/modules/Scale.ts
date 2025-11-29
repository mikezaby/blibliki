import { Context } from "@blibliki/utils";
import { IModule, Module, SetterHooks } from "@/core";
import { ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";

export type IScale = IModule<ModuleType.Scale>;
export type IScaleProps = {
  min: number;
  max: number;
  current: number;
};

export const scalePropSchema: ModulePropSchema<IScaleProps> = {
  min: {
    kind: "number",
    min: -Infinity,
    max: Infinity,
    step: 0.01,
    label: "Min",
  },
  max: {
    kind: "number",
    min: -Infinity,
    max: Infinity,
    step: 0.01,
    label: "Max",
  },
  current: {
    kind: "number",
    min: -Infinity,
    max: Infinity,
    step: 0.01,
    label: "Current",
  },
};

const DEFAULT_PROPS: IScaleProps = { min: 0, max: 1, current: 0.5 };

export default class Scale
  extends Module<ModuleType.Scale>
  implements
    Pick<
      SetterHooks<IScaleProps>,
      "onAfterSetMin" | "onAfterSetMax" | "onAfterSetCurrent"
    >
{
  declare audioNode: AudioWorkletNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Scale>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      newAudioWorklet(context, CustomWorklet.ScaleProcessor);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs();
  }

  get current() {
    return this.audioNode.parameters.get("current")!;
  }

  get min() {
    return this.audioNode.parameters.get("min")!;
  }

  get max() {
    return this.audioNode.parameters.get("max")!;
  }

  onAfterSetMin: SetterHooks<IScaleProps>["onAfterSetMin"] = (value) => {
    this.min.value = value;
  };

  onAfterSetMax: SetterHooks<IScaleProps>["onAfterSetMax"] = (value) => {
    this.max.value = value;
  };

  onAfterSetCurrent: SetterHooks<IScaleProps>["onAfterSetCurrent"] = (
    value,
  ) => {
    this.current.value = value;
  };
}
