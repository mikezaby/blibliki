import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_PROPS = {
  position: 0,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: false,
} as const;

export default class WavetableBlock extends BaseBlock {
  constructor(voices = 8) {
    super("source", "wavetable");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Wavetable",
      moduleType: ModuleType.Wavetable,
      voices,
      props: { ...DEFAULT_PROPS },
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [{ moduleId, ioName: "midi in" }],
    });

    this.addInput({
      ioName: "detune",
      kind: "audio",
      plugs: [{ moduleId, ioName: "detune" }],
    });

    this.addInput({
      ioName: "position",
      kind: "audio",
      plugs: [{ moduleId, ioName: "position" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });
  }
}
