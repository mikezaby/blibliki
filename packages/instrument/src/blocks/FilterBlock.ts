import { ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId } from "@/blocks/helpers";

const DEFAULT_PROPS = {
  cutoff: 20_000,
  envelopeAmount: 0,
  type: "lowpass",
  Q: 1,
} as const;

export default class FilterBlock extends BaseBlock {
  constructor(voices = 8) {
    super("filter", "filter");

    const moduleId = createModuleId(this.key, "main");
    const envelopeId = createModuleId(this.key, "envelope");
    const constantId = createModuleId(this.key, "constant");

    this.addModule({
      id: moduleId,
      name: "Filter",
      moduleType: ModuleType.Filter,
      voices,
      props: { ...DEFAULT_PROPS },
    });

    this.addModule({
      id: envelopeId,
      name: "FilterEnvelope",
      moduleType: ModuleType.Envelope,
      voices,
      props: {},
    });

    this.addModule({
      id: constantId,
      name: "FilterEnvelopeConst",
      moduleType: ModuleType.Constant,
      props: { value: 1 },
    });

    this.addRoute({
      source: { moduleId: constantId, ioName: "out" },
      destination: { moduleId: envelopeId, ioName: "in" },
    });

    this.addRoute({
      source: { moduleId: envelopeId, ioName: "out" },
      destination: { moduleId: moduleId, ioName: "cutoffMod" },
    });

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [
        { moduleId, ioName: "midi in" },
        { moduleId: envelopeId, ioName: "midi in" },
      ],
    });

    this.addInput({
      ioName: "in",
      kind: "audio",
      plugs: [{ moduleId, ioName: "in" }],
    });

    this.addInput({
      ioName: "cutoff",
      kind: "audio",
      plugs: [{ moduleId, ioName: "cutoff" }],
    });

    this.addInput({
      ioName: "cutoffMod",
      kind: "audio",
      plugs: [{ moduleId, ioName: "cutoffMod" }],
    });

    this.addInput({
      ioName: "Q",
      kind: "audio",
      plugs: [{ moduleId, ioName: "Q" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });
  }
}
