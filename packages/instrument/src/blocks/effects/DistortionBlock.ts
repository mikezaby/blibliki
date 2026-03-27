import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

const DEFAULT_PROPS = {
  drive: 2,
  tone: 8000,
  mix: 0,
} as const;

export default class DistortionBlock extends BaseBlock {
  constructor(key: FxBlockKey, voices = 1) {
    super(key, "distortion");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Distortion",
      moduleType: ModuleType.Distortion,
      voices,
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
        key: "drive",
        label: "Drive",
        shortLabel: "DRV",
        moduleType: ModuleType.Distortion,
        moduleId,
        propKey: "drive",
        initialValue: DEFAULT_PROPS.drive,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "tone",
        label: "Tone",
        shortLabel: "TONE",
        moduleType: ModuleType.Distortion,
        moduleId,
        propKey: "tone",
        initialValue: DEFAULT_PROPS.tone,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "mix",
        label: "Mix",
        shortLabel: "MIX",
        moduleType: ModuleType.Distortion,
        moduleId,
        propKey: "mix",
        initialValue: DEFAULT_PROPS.mix,
      }),
    );
  }
}
