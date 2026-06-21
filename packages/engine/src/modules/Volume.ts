import { Context, dbToGain } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module, ModulePropSchema, SetterHooks } from "@/core";
import { IModuleConstructor } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ICreateModule, ModuleType } from ".";

export type IVolume = IModule<ModuleType.Volume>;
export type IVolumeProps = {
  volume: number;
};

export const volumePropSchema: ModulePropSchema<IVolumeProps> = {
  volume: {
    kind: "number",
    min: -60,
    max: 6,
    step: 0.1,
    exp: 0.33,
    label: "Volume",
    shortLabel: "vol",
  },
};

const DEFAULT_PROPS: IVolumeProps = { volume: 0 };
const volumeSchema = volumePropSchema.volume;

const clampVolume = (volume: number) =>
  Math.min(volumeSchema.max, Math.max(volumeSchema.min, volume));

const volumeToGain = (volume: number) =>
  volume === volumeSchema.min ? 0 : dbToGain(volume);

export class MonoVolume
  extends Module<ModuleType.Volume>
  implements Pick<SetterHooks<IVolumeProps>, "onSetVolume" | "onAfterSetVolume">
{
  declare audioNode: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Volume>) {
    const props = {
      ...DEFAULT_PROPS,
      ...params.props,
      volume: clampVolume(params.props.volume ?? DEFAULT_PROPS.volume),
    };
    const audioNodeConstructor = (context: Context) => {
      const audioNode = new GainNode(context.audioContext);
      audioNode.gain.value = volumeToGain(props.volume);
      return audioNode;
    };

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    this.registerDefaultIOs();
  }

  onSetVolume: SetterHooks<IVolumeProps>["onSetVolume"] = clampVolume;

  onAfterSetVolume: SetterHooks<IVolumeProps>["onAfterSetVolume"] = (value) => {
    this.audioNode.gain.value = volumeToGain(value);
  };
}

export default class Volume extends PolyModule<ModuleType.Volume> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Volume>,
  ) {
    const providedProps: Partial<IVolumeProps> = params.props;
    const props = {
      ...DEFAULT_PROPS,
      ...providedProps,
      volume: clampVolume(providedProps.volume ?? DEFAULT_PROPS.volume),
    };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Volume>,
    ) => Module.create(MonoVolume, engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }
}
