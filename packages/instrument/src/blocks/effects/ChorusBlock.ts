import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

const DEFAULT_PROPS = {
  rate: 0.5,
  depth: 0.5,
  mix: 0,
  feedback: 0.2,
} as const;

export default class ChorusBlock extends BaseBlock {
  constructor(key: FxBlockKey) {
    super(key, "chorus");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Chorus",
      moduleType: ModuleType.Chorus,
      props: { ...DEFAULT_PROPS },
    });

    this.addInput({
      ioName: "in",
      kind: "audio",
      plugs: [{ moduleId, ioName: "in" }],
    });

    this.addInput({
      ioName: "rate",
      kind: "audio",
      plugs: [{ moduleId, ioName: "rate" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });

    this.addSlot(
      createModulePropSlot({
        key: "rate",
        label: "Rate",
        shortLabel: "RATE",
        moduleType: ModuleType.Chorus,
        moduleId,
        propKey: "rate",
        initialValue: DEFAULT_PROPS.rate,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "depth",
        label: "Depth",
        shortLabel: "DPT",
        moduleType: ModuleType.Chorus,
        moduleId,
        propKey: "depth",
        initialValue: DEFAULT_PROPS.depth,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "feedback",
        label: "Feedback",
        shortLabel: "FDBK",
        moduleType: ModuleType.Chorus,
        moduleId,
        propKey: "feedback",
        initialValue: DEFAULT_PROPS.feedback,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "mix",
        label: "Mix",
        shortLabel: "MIX",
        moduleType: ModuleType.Chorus,
        moduleId,
        propKey: "mix",
        initialValue: DEFAULT_PROPS.mix,
      }),
    );
  }
}
