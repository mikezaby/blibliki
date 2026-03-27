import { ModuleType, OscillatorWave } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";

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

    this.addSlot(
      createModulePropSlot({
        key: "wave",
        label: "Wave",
        shortLabel: "WAVE",
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "wave",
        initialValue: DEFAULT_PROPS.wave,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "frequency",
        label: "Frequency",
        shortLabel: "FREQ",
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "frequency",
        initialValue: DEFAULT_PROPS.frequency,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "octave",
        label: "Octave",
        shortLabel: "OCT",
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "octave",
        initialValue: DEFAULT_PROPS.octave,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "coarse",
        label: "Coarse",
        shortLabel: "CRS",
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "coarse",
        initialValue: DEFAULT_PROPS.coarse,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "fine",
        label: "Fine",
        shortLabel: "FINE",
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "fine",
        initialValue: DEFAULT_PROPS.fine,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "lowGain",
        label: "Low Gain",
        shortLabel: "LOW",
        moduleType: ModuleType.Oscillator,
        moduleId,
        propKey: "lowGain",
        initialValue: DEFAULT_PROPS.lowGain,
      }),
    );
  }
}
