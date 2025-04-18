import { IAnyAudioContext, IModule, Module } from "@/core";
import { EmptyObject } from "@/utils";
import { ICreateParams, ModuleType } from ".";

export type IMaster = IModule<ModuleType.Master>;
export type IMasterProps = EmptyObject;

const DEFAULT_PROPS: IMasterProps = {};

export default class Master extends Module<ModuleType.Master> {
  declare audioNode: AudioDestinationNode;

  constructor(
    context: IAnyAudioContext,
    params: ICreateParams<ModuleType.Master>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNode = context.destination;

    super(context, { ...params, audioNode, props });

    this.registerDefaultIOs("in");
  }
}
