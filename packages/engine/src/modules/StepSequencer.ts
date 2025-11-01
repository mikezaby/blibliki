import { INote, PropSchema, Module, IModule, MidiOutput } from "@/core";
import { ICreateModule, ModuleType } from ".";

export type IStepSequencer = IModule<ModuleType.StepSequencer>;

export type ISequence = {
  active: boolean;
  // time: BarsBeatsSixteenths;
  duration: string;
  notes: INote[];
};

export type IStepSequencerProps = {
  bars: number;
  steps: number;
  sequences: ISequence[][];
};

export const stepSequencerPropSchema: PropSchema<
  Omit<IStepSequencerProps, "sequences">
> = {
  steps: {
    kind: "number",
    min: 1,
    max: 16,
    step: 1,
    label: "Steps",
  },
  bars: {
    kind: "number",
    min: 1,
    max: 16,
    step: 1,
    label: "Steps",
  },
};

const DEFAULT_PROPS: IStepSequencerProps = {
  sequences: [],
  steps: 16,
  bars: 1,
};

// Not implemented yet, just the data modeling
export default class StepSequencer extends Module<ModuleType.StepSequencer> {
  declare audioNode: undefined;
  midiOutput!: MidiOutput;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.StepSequencer>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });
  }
}
