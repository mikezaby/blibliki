import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  VideoModule,
} from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type ISampleHoldProps = IInstancesProps & {
  input: number;
  trigger: number;
};

const DEFAULT_PROPS: ISampleHoldProps = {
  input: 0,
  trigger: 0,
  ...DEFAULT_INSTANCES_PROPS,
};

export const sampleHoldPropSchema: ModulePropSchema<ISampleHoldProps> = {
  ...instancesPropSchema,
  input: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Input",
    shortLabel: "in",
  },
  trigger: {
    kind: "number",
    min: 0,
    max: 1,
    step: 1,
    label: "Trigger",
    shortLabel: "trig",
  },
};

type State = { held: number; armed: boolean };

// Copies the input on each rising edge of the trigger and holds it until
// the next one, per instance. A Trigger pulse into the trigger and an LFO
// on random into the input jumps a prop on every hit and holds it between.
export default class SampleHold extends VideoModule<VideoModuleType.SampleHold> {
  readonly inputs = [
    { name: "input", kind: "control" },
    { name: "trigger", kind: "control" },
  ] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = sampleHoldPropSchema;
  private states: State[] = [];

  constructor(params: ICreateVideoModule<VideoModuleType.SampleHold>) {
    super(VideoModuleType.SampleHold, DEFAULT_PROPS, params);
  }

  tick(
    _values: ControlValues,
    _frame: Frame,
    props = this.props,
    instance = 0,
  ) {
    const state = (this.states[instance] ??= { held: 0, armed: true });
    const high = props.trigger > 0.5;
    if (high && state.armed) state.held = props.input;
    state.armed = !high;

    return { out: state.held };
  }
}
