import {
  ControlValues,
  FrameClock,
  ICreateVideoModule,
  IOPort,
  VideoModule,
} from "@/core/Module";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export const LFO_WAVEFORMS = [
  "sine",
  "triangle",
  "square",
  "sawtooth",
  "random",
] as const;

export type LFOWaveform = (typeof LFO_WAVEFORMS)[number];

export type ILFOProps = {
  frequency: number;
  waveform: LFOWaveform;
  phase: number;
};

const DEFAULT_PROPS: ILFOProps = { frequency: 1, waveform: "sine", phase: 0 };

export const lfoPropSchema: ModulePropSchema<
  ILFOProps,
  { waveform: EnumProp<LFOWaveform> }
> = {
  frequency: {
    kind: "number",
    min: 0.01,
    max: 40,
    step: 0.01,
    exp: 3,
    label: "Frequency",
    shortLabel: "hz",
  },
  waveform: {
    kind: "enum",
    options: [...LFO_WAVEFORMS],
    label: "Waveform",
    shortLabel: "wave",
  },
  phase: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Phase",
    shortLabel: "phase",
  },
};

function shape(waveform: LFOWaveform, phase: number, held: number): number {
  switch (waveform) {
    case "sine":
      return 0.5 + 0.5 * Math.sin(2 * Math.PI * phase);
    case "triangle":
      return phase < 0.5 ? 2 * phase : 2 - 2 * phase;
    case "square":
      return phase < 0.5 ? 1 : 0;
    case "sawtooth":
      return phase;
    case "random":
      return held;
  }
}

// Unipolar 0..1 at frame rate. Phase advances by dt * frequency, so a dropped
// frame slows the LFO instead of jumping it. ponytail: no transport sync;
// needs bpm and a start time from the host.
export default class LFO extends VideoModule<VideoModuleType.LFO> {
  readonly inputs = [{ name: "frequency", kind: "control" }] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = lfoPropSchema;
  private phase = 0;
  private held = Math.random();

  constructor(params: ICreateVideoModule<VideoModuleType.LFO>) {
    super(VideoModuleType.LFO, DEFAULT_PROPS, params);
  }

  tick(_values: ControlValues, frame: FrameClock, props = this.props) {
    const next = this.phase + frame.dt * props.frequency;
    if (next >= 1) this.held = Math.random();
    this.phase = next % 1;

    const at = (this.phase + props.phase) % 1;

    return { out: shape(props.waveform, at, this.held) };
  }
}
