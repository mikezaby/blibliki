import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  MidiNoteEvent,
  VideoModule,
} from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesProp,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IEnvelopeProps = IInstancesProps & {
  gate: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

const DEFAULT_PROPS: IEnvelopeProps = {
  gate: 0,
  attack: 0.1,
  decay: 0.1,
  sustain: 1,
  release: 0.1,
  ...DEFAULT_INSTANCES_PROPS,
};

export const envelopePropSchema: ModulePropSchema<IEnvelopeProps> = {
  ...instancesPropSchema,
  gate: {
    kind: "number",
    min: 0,
    max: 1,
    step: 1,
    label: "Gate",
    shortLabel: "gate",
  },
  attack: {
    kind: "number",
    min: 0,
    max: 10,
    step: 0.01,
    exp: 7,
    label: "Attack",
    shortLabel: "A",
  },
  decay: {
    kind: "number",
    min: 0,
    max: 10,
    step: 0.01,
    exp: 6.6,
    label: "Decay",
    shortLabel: "D",
  },
  sustain: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Sustain",
    shortLabel: "S",
  },
  release: {
    kind: "number",
    min: 0,
    max: 10,
    step: 0.01,
    exp: 5,
    label: "Release",
    shortLabel: "R",
  },
};

type Stage = "idle" | "attack" | "decay" | "sustain" | "release";
type InstanceState = { stage: Stage; level: number };

// ADSR at frame rate, 0..1, one per instance. A note on the MIDI input
// opens the instance it is tagged for (instance 0 when untagged) and its
// note off closes it, as the audio Envelope follows its MIDI input; the
// `gate` prop opens every instance a control route reaches. A segment runs
// at the rate of its full swing, so a retrigger during the release climbs
// from the current level.
// ponytail: linear segments, one per tick; curves and same-tick
// fall-through when a patch needs them.
export default class Envelope extends VideoModule<VideoModuleType.Envelope> {
  readonly inputs = [
    { name: "in", kind: "midi" },
    { name: "gate", kind: "control" },
  ] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = envelopePropSchema;
  private states: InstanceState[] = [];
  private held: boolean[] = [];

  constructor(params: ICreateVideoModule<VideoModuleType.Envelope>) {
    super(VideoModuleType.Envelope, DEFAULT_PROPS, params);
  }

  receiveMidi(_ioName: string, event: MidiNoteEvent) {
    const instance = event.instance ?? 0;
    if (instance < instancesProp(this.props)) {
      this.held[instance] = event.type === "noteOn";
    }
  }

  tick(_values: ControlValues, frame: Frame, props = this.props, instance = 0) {
    const state = (this.states[instance] ??= { stage: "idle", level: 0 });
    const on = props.gate > 0.5 || this.held[instance] === true;
    if (on && (state.stage === "idle" || state.stage === "release")) {
      state.stage = "attack";
    } else if (!on && state.stage !== "idle" && state.stage !== "release") {
      state.stage = "release";
    }

    const toward = (target: number, seconds: number, swing: number) => {
      if (seconds <= 0) return target;
      const step = (frame.dt * swing) / seconds;

      return state.level < target
        ? Math.min(target, state.level + step)
        : Math.max(target, state.level - step);
    };

    switch (state.stage) {
      case "attack":
        state.level = toward(1, props.attack, 1);
        if (state.level >= 1) state.stage = "decay";
        break;
      case "decay":
        state.level = toward(props.sustain, props.decay, 1 - props.sustain);
        if (state.level === props.sustain) state.stage = "sustain";
        break;
      case "sustain":
        state.level = props.sustain;
        break;
      case "release":
        state.level = toward(0, props.release, 1);
        if (state.level <= 0) state.stage = "idle";
        break;
      case "idle":
        state.level = 0;
    }

    return { out: state.level };
  }
}
