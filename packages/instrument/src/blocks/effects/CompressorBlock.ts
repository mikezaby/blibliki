import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

const DEFAULT_PROPS = {
  threshold: 0,
  ratio: 4,
  knee: 6,
  attack: 0.001,
  release: 0.003,
  makeup: 0,
  mix: 0,
} as const;

export default class CompressorBlock extends BaseBlock {
  constructor(key: FxBlockKey) {
    super(key, "compressor");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Compressor",
      moduleType: ModuleType.Compressor,
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
