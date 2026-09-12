import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  VideoModule,
} from "@/core/Module";
import { AudioModuleProp, EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export const FOLLOWER_SOURCES = ["level", "band"] as const;
export type FollowerSource = (typeof FOLLOWER_SOURCES)[number];

export type IAudioFollowerProps = {
  moduleId: string;
  source: FollowerSource;
  lowHz: number;
  highHz: number;
  minDb: number;
  maxDb: number;
  attack: number;
  release: number;
};

const DEFAULT_PROPS: IAudioFollowerProps = {
  moduleId: "",
  source: "band",
  lowHz: 20,
  highHz: 200,
  minDb: -60,
  maxDb: -10,
  attack: 0.01,
  release: 0.15,
};

export const audioFollowerPropSchema: ModulePropSchema<
  IAudioFollowerProps,
  { moduleId: AudioModuleProp; source: EnumProp<FollowerSource> }
> = {
  moduleId: {
    kind: "audioModule",
    label: "Audio module",
    shortLabel: "mod",
  },
  source: {
    kind: "enum",
    options: [...FOLLOWER_SOURCES],
    label: "Source",
    shortLabel: "src",
  },
  lowHz: {
    kind: "number",
    min: 20,
    max: 20000,
    step: 1,
    exp: 3,
    label: "Low",
    shortLabel: "low",
  },
  highHz: {
    kind: "number",
    min: 20,
    max: 20000,
    step: 1,
    exp: 3,
    label: "High",
    shortLabel: "high",
  },
  minDb: {
    kind: "number",
    min: -150,
    max: 0,
    step: 1,
    label: "Min dB",
    shortLabel: "min",
  },
  maxDb: {
    kind: "number",
    min: -150,
    max: 0,
    step: 1,
    label: "Max dB",
    shortLabel: "max",
  },
  attack: {
    kind: "number",
    min: 0,
    max: 2,
    step: 0.001,
    exp: 3,
    label: "Attack",
    shortLabel: "A",
  },
  release: {
    kind: "number",
    min: 0,
    max: 5,
    step: 0.001,
    exp: 3,
    label: "Release",
    shortLabel: "R",
  },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// A saved Band node, from before this module replaced it on 2026-09-12.
type SavedBandProps = Partial<
  Pick<IAudioFollowerProps, "moduleId" | "lowHz" | "highHz">
> & { gain?: number; smoothing?: number };

export function fromBand(props: SavedBandProps): Partial<IAudioFollowerProps> {
  const { moduleId, lowHz, highHz } = props;

  return { moduleId, source: "band", lowHz, highHz };
}

// Level of an audio module's output, overall or of one frequency band,
// mapped from the minDb..maxDb window to 0..1 and followed with attack
// and release ballistics, one level per instance. The host keeps one
// analyser per referenced module and ships its peak and bins each frame;
// this only averages a slice, so many followers on one module cost one
// FFT.
export default class AudioFollower extends VideoModule<VideoModuleType.AudioFollower> {
  readonly inputs = [
    { name: "lowHz", kind: "control" },
    { name: "highHz", kind: "control" },
  ] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = audioFollowerPropSchema;
  private levels: number[] = [];

  constructor(params: ICreateVideoModule<VideoModuleType.AudioFollower>) {
    super(VideoModuleType.AudioFollower, DEFAULT_PROPS, params);
  }

  tick(_values: ControlValues, frame: Frame, props = this.props, instance = 0) {
    const spectrum = frame.spectra?.get(props.moduleId);
    let db = -Infinity;
    if (spectrum) {
      db =
        props.source === "level"
          ? spectrum.levelDb
          : bandDb(spectrum.bins, spectrum.sampleRate, props);
    }
    const target = clamp01((db - props.minDb) / (props.maxDb - props.minDb));

    const last = this.levels[instance] ?? 0;
    const seconds = target > last ? props.attack : props.release;
    const level =
      seconds > 0
        ? target + (last - target) * Math.exp(-frame.dt / seconds)
        : target;
    this.levels[instance] = level;

    return { out: level };
  }
}

function bandDb(
  bins: Float32Array,
  sampleRate: number,
  props: Pick<IAudioFollowerProps, "lowHz" | "highHz">,
): number {
  if (bins.length === 0) return -Infinity;
  const hzPerBin = sampleRate / (bins.length * 2);
  let from = Math.ceil(props.lowHz / hzPerBin);
  let to = Math.floor(props.highHz / hzPerBin);
  if (from > to) {
    from = to = Math.round((props.lowHz + props.highHz) / 2 / hzPerBin);
  }
  from = Math.max(0, from);
  to = Math.min(bins.length - 1, to);
  if (from > to) return -Infinity;

  let sum = 0;
  for (let i = from; i <= to; i++) sum += bins[i] ?? -Infinity;

  return sum / (to - from + 1);
}
