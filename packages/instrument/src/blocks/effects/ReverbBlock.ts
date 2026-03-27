import { ModuleType, ReverbType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

const DEFAULT_PROPS = {
  mix: 0,
  decayTime: 1.5,
  preDelay: 0,
  type: ReverbType.room,
} as const;

export default class ReverbBlock extends BaseBlock {
  constructor(key: FxBlockKey) {
    super(key, "reverb");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Reverb",
      moduleType: ModuleType.Reverb,
      props: { ...DEFAULT_PROPS },
    });

    this.addInput({
      ioName: "in",
      kind: "audio",
      plugs: [{ moduleId, ioName: "in" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });

    this.addSlot(
      createModulePropSlot({
        key: "type",
        label: "Type",
        shortLabel: "TYPE",
        moduleType: ModuleType.Reverb,
        moduleId,
        propKey: "type",
        initialValue: DEFAULT_PROPS.type,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "decay",
        label: "Decay",
        shortLabel: "DEC",
        moduleType: ModuleType.Reverb,
        moduleId,
        propKey: "decayTime",
        initialValue: DEFAULT_PROPS.decayTime,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "preDelay",
        label: "Pre-delay",
        shortLabel: "PRE",
        moduleType: ModuleType.Reverb,
        moduleId,
        propKey: "preDelay",
        initialValue: DEFAULT_PROPS.preDelay,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "mix",
        label: "Mix",
        shortLabel: "MIX",
        moduleType: ModuleType.Reverb,
        moduleId,
        propKey: "mix",
        initialValue: DEFAULT_PROPS.mix,
      }),
    );
  }
}
