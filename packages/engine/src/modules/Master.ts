import { Context, EmptyObject } from "@blibliki/utils";
import { IModule, Module, ModulePropSchema } from "@/core";
import { ICreateModule, ModuleType } from ".";

export type IMaster = IModule<ModuleType.Master>;
export type IMasterProps = EmptyObject;

const DEFAULT_PROPS: IMasterProps = {};

export const masterPropSchema: ModulePropSchema<IMasterProps> = {};

export default class Master extends Module<ModuleType.Master> {
  declare audioNode: AudioDestinationNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Master>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) => context.destination;

    super(engineId, { ...params, audioNodeConstructor, props });

    this.registerDefaultIOs("in");
  }
}
