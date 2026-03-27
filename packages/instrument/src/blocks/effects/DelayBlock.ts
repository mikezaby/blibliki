import { DelayTimeMode, ModuleType } from "@blibliki/engine";
import BaseBlock from "@/blocks/BaseBlock";
import { createModuleId, createModulePropSlot } from "@/blocks/helpers";
import type { BlockKey } from "@/types";

type FxBlockKey = Extract<BlockKey, "fx1" | "fx2" | "fx3" | "fx4">;

const DEFAULT_PROPS = {
  time: 250,
  timeMode: DelayTimeMode.short,
  sync: false,
  division: "1/4",
  feedback: 0.3,
  mix: 0,
  stereo: false,
} as const;

export default class DelayBlock extends BaseBlock {
  constructor(key: FxBlockKey) {
    super(key, "delay");

    const moduleId = createModuleId(this.key, "main");

    this.addModule({
      id: moduleId,
      name: "Delay",
      moduleType: ModuleType.Delay,
      props: { ...DEFAULT_PROPS },
    });

    this.addInput({
      ioName: "in",
      kind: "audio",
      plugs: [{ moduleId, ioName: "in" }],
    });

    this.addOutput({
      ioName: "out",
      kind: "audio",
      plugs: [{ moduleId, ioName: "out" }],
    });

    this.addSlot(
      createModulePropSlot({
        key: "time",
        label: "Time",
        shortLabel: "TIME",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "time",
        initialValue: DEFAULT_PROPS.time,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "timeMode",
        label: "Time Mode",
        shortLabel: "MODE",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "timeMode",
        initialValue: DEFAULT_PROPS.timeMode,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "sync",
        label: "Sync",
        shortLabel: "SYNC",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "sync",
        initialValue: DEFAULT_PROPS.sync,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "division",
        label: "Division",
        shortLabel: "DIV",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "division",
        initialValue: DEFAULT_PROPS.division,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "feedback",
        label: "Feedback",
        shortLabel: "FDBK",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "feedback",
        initialValue: DEFAULT_PROPS.feedback,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "mix",
        label: "Mix",
        shortLabel: "MIX",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "mix",
        initialValue: DEFAULT_PROPS.mix,
      }),
    );

    this.addSlot(
      createModulePropSlot({
        key: "stereo",
        label: "Stereo",
        shortLabel: "ST",
        moduleType: ModuleType.Delay,
        moduleId,
        propKey: "stereo",
        initialValue: DEFAULT_PROPS.stereo,
      }),
    );
  }
}
