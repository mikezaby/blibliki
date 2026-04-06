import { ModuleType, OscillatorWave } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_PROPS = {
  wave: OscillatorWave.sine,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: true,
} as const;

export default class OscBlock extends BaseBlock {
  constructor(voices = 8) {
    super("source", "osc");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Oscillator",
      moduleType: ModuleType.Oscillator,
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
      ioName: "fm",
      kind: "audio",
      plugs: [{ moduleId, ioName: "fm" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });
  }
}
