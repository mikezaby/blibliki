import { DelayTimeMode, ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

const DEFAULT_PROPS = {
  time: 250,
  timeMode: DelayTimeMode.short,
  sync: false,
  division: "1/4",
  feedback: 0.3,
  mix: 0,
  stereo: false,
} as const;

export default class DelayBlock extends BaseBlock {
  constructor(key: FxBlockKey) {
    super(key, "delay");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Delay",
      moduleType: ModuleType.Delay,
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
  }
}
