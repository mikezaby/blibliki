import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

// An empty fx slot. Audio passes through untouched (unity-gain Volume), so the
// fixed filter -> fx1..fx4 -> trackGain routing stays intact regardless of how
// many slots are filled.
// ponytail: passthrough node per empty slot; skip-and-rewire the chain instead
// if the extra gain nodes ever matter.
export default class NoneBlock extends BaseBlock {
  constructor(key: FxBlockKey, voices = 1) {
    super(key, "none");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Empty",
      moduleType: ModuleType.Volume,
      voices,
      props: { volume: 0 },
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
