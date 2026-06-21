import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_VOLUME = 0;

export default class TrackGainBlock extends BaseBlock {
  constructor() {
    super("trackGain", "trackGain");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Track Volume",
      moduleType: ModuleType.Volume,
      props: {
        volume: DEFAULT_VOLUME,
      },
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
