import { ModuleType, OscillatorWave } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";

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
    });

    this.addModule({
      id: osc2Id,
      name: "Osc 2",
      moduleType: ModuleType.Oscillator,
      voices,
      props: { ...OSC2_DEFAULTS },
    });

    this.addModule({
      id: osc3Id,
      name: "Osc 3",
      moduleType: ModuleType.Oscillator,
      voices,
      props: { ...OSC3_DEFAULTS },
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

    this.addOscSlots(osc1Id, "1", OSC1_DEFAULTS);
    this.addOscSlots(osc2Id, "2", OSC2_DEFAULTS);
    this.addOscSlots(osc3Id, "3", OSC3_DEFAULTS);

    this.addSlot(
      createModulePropSlot({
        key: "mix",
        label: "Mix",
        shortLabel: "MIX",
        moduleType: ModuleType.Gain,
        moduleId: mixId,
        propKey: "gain",
        initialValue: MIX_DEFAULT_GAIN,
      }),
    );
  }

  private addOscSlots(
    moduleId: string,
    suffix: string,
    defaults: {
      wave: OscillatorWave;
      coarse: number;
      fine: number;
      octave: number;
    },
  ) {
    this.addSlot(
      createModulePropSlot({
        key: `wave${suffix}`,
        label: `Wave ${suffix}`,
        shortLabel: `W${suffix}`,
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "wave",
        initialValue: defaults.wave,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: `coarse${suffix}`,
        label: `Coarse ${suffix}`,
        shortLabel: `C${suffix}`,
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "coarse",
        initialValue: defaults.coarse,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: `fine${suffix}`,
        label: `Fine ${suffix}`,
        shortLabel: `F${suffix}`,
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "fine",
        initialValue: defaults.fine,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: `octave${suffix}`,
        label: `Octave ${suffix}`,
        shortLabel: `O${suffix}`,
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "octave",
        initialValue: defaults.octave,
      }),
    );
  }
}
