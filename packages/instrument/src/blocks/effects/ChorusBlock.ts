import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";
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
  }
}
