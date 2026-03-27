import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";

const DEFAULT_GAIN = 1;
const DEFAULT_ENVELOPE_PROPS = {
  attack: 0.01,
  decay: 0,
  sustain: 1,
  release: 0.05,
} as const;

export default class AmpBlock extends BaseBlock {
  constructor(voices = 8) {
    super("amp", "amp");

    const gainId = createModuleId(this.key, "gain");
    const envelopeId = createModuleId(this.key, "envelope");

    this.addModule({
      id: envelopeId,
      name: "AmpEnvelope",
      moduleType: ModuleType.Envelope,
      voices,
      props: { ...DEFAULT_ENVELOPE_PROPS },
    });

    this.addModule({
      id: gainId,
      name: "Amp",
      moduleType: ModuleType.Gain,
      voices,
      props: {
        gain: DEFAULT_GAIN,
      },
    });

    this.addRoute({
      source: { moduleId: envelopeId, ioName: "out" },
      destination: { moduleId: gainId, ioName: "in" },
    });

    this.addInput({
      ioName: "in",
      kind: "audio",
      plugs: [{ moduleId: envelopeId, ioName: "in" }],
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [{ moduleId: envelopeId, ioName: "midi in" }],
    });

    this.addInput({
      ioName: "gain",
      kind: "audio",
      plugs: [{ moduleId: gainId, ioName: "gain" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId: gainId, ioName: "out" }],
    });

    this.addSlot(
      createModulePropSlot({
        key: "gain",
        label: "Gain",
        shortLabel: "GAIN",
        moduleType: ModuleType.Gain,
        moduleId: gainId,
        propKey: "gain",
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "attack",
        label: "Attack",
        shortLabel: "A",
        moduleType: ModuleType.Envelope,
        moduleId: envelopeId,
        propKey: "attack",
      }),
    );
    this.addSlot(
      createModulePropSlot({
        key: "decay",
        label: "Decay",
        shortLabel: "D",
        moduleType: ModuleType.Envelope,
        moduleId: envelopeId,
        propKey: "decay",
      }),
    );
    this.addSlot(
      createModulePropSlot({
        key: "sustain",
        label: "Sustain",
        shortLabel: "S",
        moduleType: ModuleType.Envelope,
        moduleId: envelopeId,
        propKey: "sustain",
      }),
    );
    this.addSlot(
      createModulePropSlot({
        key: "release",
        label: "Release",
        shortLabel: "R",
        moduleType: ModuleType.Envelope,
        moduleId: envelopeId,
        propKey: "release",
      }),
    );
  }
}
