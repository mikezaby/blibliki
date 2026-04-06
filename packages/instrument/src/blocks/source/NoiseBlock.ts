import { ModuleType, NoiseType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_TYPE = NoiseType.white;

export default class NoiseBlock extends BaseBlock {
  constructor() {
    super("source", "noise");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Noise",
      moduleType: ModuleType.Noise,
      props: {
        type: DEFAULT_TYPE,
      },
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [{ moduleId, ioName: "midi in" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });
  }
}
