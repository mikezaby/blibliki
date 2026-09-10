import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  VideoModule,
} from "@/core/Module";
import { DEFAULT_POLY_PROPS, IPolyProps, polyPropSchema } from "@/core/poly";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IEnvelopeProps = IPolyProps & {
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
  ...DEFAULT_POLY_PROPS,
};

export const envelopePropSchema: ModulePropSchema<IEnvelopeProps> = {
  ...polyPropSchema,
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
type VoiceState = { stage: Stage; level: number };

// ADSR at frame rate, 0..1, one per voice. The gate is a prop so a control
// route (a MIDI voice's gate, later) opens and closes it per voice; above
// 0.5 is on. A segment runs at the rate of its full swing, so a retrigger
// during the release climbs from the current level.
// ponytail: linear segments, one per tick; curves and same-tick fall-through
// when a patch needs them.
export default class Envelope extends VideoModule<VideoModuleType.Envelope> {
  readonly inputs = [{ name: "gate", kind: "control" }] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = envelopePropSchema;
  private states: VoiceState[] = [];

  constructor(params: ICreateVideoModule<VideoModuleType.Envelope>) {
    super(VideoModuleType.Envelope, DEFAULT_PROPS, params);
  }

  tick(_values: ControlValues, frame: Frame, props = this.props, voice = 0) {
    const state = (this.states[voice] ??= { stage: "idle", level: 0 });
    const on = props.gate > 0.5;
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
