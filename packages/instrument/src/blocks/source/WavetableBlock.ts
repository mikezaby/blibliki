import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";

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

    this.addSlot(
      createModulePropSlot({
        key: "position",
        label: "Position",
        shortLabel: "POS",
        moduleType: ModuleType.Wavetable,
        moduleId,
        propKey: "position",
        initialValue: DEFAULT_PROPS.position,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "frequency",
        label: "Frequency",
        shortLabel: "FREQ",
        moduleType: ModuleType.Wavetable,
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
        moduleType: ModuleType.Wavetable,
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
        moduleType: ModuleType.Wavetable,
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
        moduleType: ModuleType.Wavetable,
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
        moduleType: ModuleType.Wavetable,
        moduleId,
        propKey: "lowGain",
        initialValue: DEFAULT_PROPS.lowGain,
      }),
    );
  }
}
