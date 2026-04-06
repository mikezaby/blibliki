import { ModuleType, OscillatorWave } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_OSC_PROPS = {
  wave: OscillatorWave.sawtooth,
  frequency: 440,
  fine: 0,
  octave: 0,
  lowGain: true,
} as const;

const OSC1_DEFAULTS = {
  ...DEFAULT_OSC_PROPS,
  coarse: -12,
} as const;

const OSC2_DEFAULTS = {
  ...DEFAULT_OSC_PROPS,
  coarse: 0,
} as const;

const OSC3_DEFAULTS = {
  ...DEFAULT_OSC_PROPS,
  coarse: 12,
} as const;

const MIX_DEFAULT_GAIN = 0.33;

export default class ThreeOscBlock extends BaseBlock {
  constructor(voices = 8) {
    super("source", "threeOsc");

    const osc1Id = createModuleId(this.key, "osc1");
    const osc2Id = createModuleId(this.key, "osc2");
    const osc3Id = createModuleId(this.key, "osc3");
    const mixId = createModuleId(this.key, "mix");

    this.addModule({
      id: osc1Id,
      name: "Osc 1",
      moduleType: ModuleType.Oscillator,
      voices,
      props: { ...OSC1_DEFAULTS },
      slotSuffix: "1",
    });

    this.addModule({
      id: osc2Id,
      name: "Osc 2",
      moduleType: ModuleType.Oscillator,
      voices,
      props: { ...OSC2_DEFAULTS },
      slotSuffix: "2",
    });

    this.addModule({
      id: osc3Id,
      name: "Osc 3",
      moduleType: ModuleType.Oscillator,
      voices,
      props: { ...OSC3_DEFAULTS },
      slotSuffix: "3",
    });

    this.addModule({
      id: mixId,
      name: "Mixer",
      moduleType: ModuleType.Gain,
      voices,
      props: {
        gain: MIX_DEFAULT_GAIN,
      },
    });

    this.addRoute({
      source: { moduleId: osc1Id, ioName: "out" },
      destination: { moduleId: mixId, ioName: "in" },
    });

    this.addRoute({
      source: { moduleId: osc2Id, ioName: "out" },
      destination: { moduleId: mixId, ioName: "in" },
    });

    this.addRoute({
      source: { moduleId: osc3Id, ioName: "out" },
      destination: { moduleId: mixId, ioName: "in" },
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [
        { moduleId: osc1Id, ioName: "midi in" },
        { moduleId: osc2Id, ioName: "midi in" },
        { moduleId: osc3Id, ioName: "midi in" },
      ],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId: mixId, ioName: "out" }],
    });
  }
}
