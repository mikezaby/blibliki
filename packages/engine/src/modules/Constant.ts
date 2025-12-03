import { ContextTime } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { ConstantSourceNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module, ModulePropSchema, SetterHooks } from "@/core";
import Note from "@/core/Note";
import { ICreateModule, ModuleType } from ".";

export type IConstant = IModule<ModuleType.Constant>;
export type IConstantProps = {
  value: number;
};

export const constantPropSchema: ModulePropSchema<IConstantProps> = {
  value: {
    kind: "number",
    min: -Infinity,
    max: Infinity,
    step: 0.01,
    label: "Value",
  },
};

const DEFAULT_PROPS: IConstantProps = { value: 1 };

export default class Constant
  extends Module<ModuleType.Constant>
  implements Pick<SetterHooks<IConstantProps>, "onAfterSetValue">
{
  declare audioNode: ConstantSourceNode;
  isStated = false;

  constructor(engineId: string, params: ICreateModule<ModuleType.Constant>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new ConstantSourceNode(context.audioContext);

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.registerDefaultIOs("out");
  }

  onAfterSetValue: SetterHooks<IConstantProps>["onAfterSetValue"] = (value) => {
    this.audioNode.offset.value = value;
  };

  start(time: ContextTime) {
    if (this.isStated) return;

    this.isStated = true;
    this.audioNode.start(time);
  }

  stop(time: ContextTime) {
    if (!this.isStated) return;

    this.audioNode.stop(time);
    this.rePlugAll(() => {
      this.audioNode = new ConstantSourceNode(this.context.audioContext, {
        offset: this.props.value,
      });
    });

    this.isStated = false;
  }

  triggerAttack = (note: Note, triggeredAt: ContextTime) => {
    this.audioNode.offset.setValueAtTime(note.frequency, triggeredAt);
    this.start(triggeredAt);
  };

  triggerRelease = () => {
    // Do nothing
  };
}
