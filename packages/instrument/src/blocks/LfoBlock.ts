import { LFOWaveform, ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";

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

    this.addSlot(
      createModulePropSlot({
        key: "waveform",
        label: "Waveform",
        shortLabel: "WAVE",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "waveform",
        initialValue: DEFAULT_PROPS.waveform,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "frequency",
        label: "Frequency",
        shortLabel: "FREQ",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "frequency",
        initialValue: DEFAULT_PROPS.frequency,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "division",
        label: "Division",
        shortLabel: "DIV",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "division",
        initialValue: DEFAULT_PROPS.division,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "offset",
        label: "Offset",
        shortLabel: "OFF",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "offset",
        initialValue: DEFAULT_PROPS.offset,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "amount",
        label: "Amount",
        shortLabel: "AMT",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "amount",
        initialValue: DEFAULT_PROPS.amount,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "sync",
        label: "Sync",
        shortLabel: "SYNC",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "sync",
        initialValue: DEFAULT_PROPS.sync,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "phase",
        label: "Phase",
        shortLabel: "PHASE",
        moduleType: ModuleType.LFO,
        moduleId,
        propKey: "phase",
        initialValue: DEFAULT_PROPS.phase,
      }),
    );
  }
}
