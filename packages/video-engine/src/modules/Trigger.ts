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
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export const TRIGGER_MODES = ["gate", "pulse"] as const;
export type TriggerMode = (typeof TRIGGER_MODES)[number];

export type ITriggerProps = IInstancesProps & {
  input: number;
  threshold: number;
  mode: TriggerMode;
  hold: number;
};

const DEFAULT_PROPS: ITriggerProps = {
  input: 0,
  threshold: 0.5,
  mode: "pulse",
  hold: 0.1,
  ...DEFAULT_INSTANCES_PROPS,
};

export const triggerPropSchema: ModulePropSchema<
  ITriggerProps,
  { mode: EnumProp<TriggerMode> }
> = {
  ...instancesPropSchema,
  input: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Input",
    shortLabel: "in",
  },
  threshold: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Threshold",
    shortLabel: "thresh",
  },
  mode: {
    kind: "enum",
    options: [...TRIGGER_MODES],
    label: "Mode",
    shortLabel: "mode",
  },
  hold: {
    kind: "number",
    min: 0.01,
    max: 2,
    step: 0.01,
    exp: 2,
    label: "Hold",
    shortLabel: "hold",
  },
};

type State = { above: boolean; remaining: number };

// Turns a level into a gate: 1 while the input is above the threshold, or
// a pulse of `hold` seconds each time it crosses upward. A Band into the
// input and the output into an Envelope's gate makes a hit fire a shape.
export default class Trigger extends VideoModule<VideoModuleType.Trigger> {
  readonly inputs = [
    { name: "input", kind: "control" },
    { name: "threshold", kind: "control" },
  ] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = triggerPropSchema;
  private states: State[] = [];

  constructor(params: ICreateVideoModule<VideoModuleType.Trigger>) {
    super(VideoModuleType.Trigger, DEFAULT_PROPS, params);
  }

  tick(_values: ControlValues, frame: Frame, props = this.props, instance = 0) {
    const state = (this.states[instance] ??= { above: false, remaining: 0 });
    const above = props.input > props.threshold;
    const rising = above && !state.above;
    state.above = above;
    if (props.mode === "gate") return { out: above ? 1 : 0 };

    if (rising) state.remaining = props.hold;
    const out = state.remaining > 0 ? 1 : 0;
    state.remaining = Math.max(0, state.remaining - frame.dt);

    return { out };
  }
}
