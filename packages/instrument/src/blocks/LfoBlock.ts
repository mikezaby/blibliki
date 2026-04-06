import { LFOWaveform, ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_PROPS = {
  waveform: LFOWaveform.sine,
  frequency: 1,
  division: "1/4",
  offset: 0,
  amount: 1,
  sync: false,
  phase: 0,
} as const;

export default class LfoBlock extends BaseBlock {
  constructor(voices = 8) {
    super("lfo1", "lfo");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "LFO 1",
      moduleType: ModuleType.LFO,
      voices,
      props: { ...DEFAULT_PROPS },
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });
  }
}
