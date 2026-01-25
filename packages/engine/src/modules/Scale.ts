import { Context } from "@blibliki/utils";
import { IModule, Module, SetterHooks } from "@/core";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";

export type IScale = IModule<ModuleType.Scale>;
export type IScaleProps = {
  min: number;
  max: number;
  current: number;
  mode: "exponential" | "linear";
};

export const scalePropSchema: ModulePropSchema<
  IScaleProps,
  { mode: import("@/core/schema").EnumProp<"exponential" | "linear"> }
> = {
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
  mode: {
    kind: "enum",
    label: "Mode",
    options: ["exponential", "linear"],
  },
};

const DEFAULT_PROPS: IScaleProps = {
  min: 0,
  max: 1,
  current: 0.5,
  mode: "exponential",
};

export class MonoScale
  extends Module<ModuleType.Scale>
  implements
    Pick<
      SetterHooks<IScaleProps>,
      "onAfterSetMin" | "onAfterSetMax" | "onAfterSetCurrent" | "onAfterSetMode"
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

  get mode() {
    return this.audioNode.parameters.get("mode")!;
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

  onAfterSetMode: SetterHooks<IScaleProps>["onAfterSetMode"] = (value) => {
    this.mode.value = value === "exponential" ? 0 : 1;
  };
}

export default class Scale extends PolyModule<ModuleType.Scale> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Scale>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Scale>,
    ) => Module.create(MonoScale, engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }
}
