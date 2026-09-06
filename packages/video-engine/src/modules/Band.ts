import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  VideoModule,
} from "@/core/Module";
import { AudioModuleProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IBandProps = {
  moduleId: string;
  lowHz: number;
  highHz: number;
  gain: number;
  smoothing: number;
};

const DEFAULT_PROPS: IBandProps = {
  moduleId: "",
  lowHz: 20,
  highHz: 200,
  gain: 1,
  smoothing: 0,
};

// The host's analyser taps use the Web Audio defaults; gain covers the rest.
const MIN_DB = -100;
const MAX_DB = -30;

export const bandPropSchema: ModulePropSchema<
  IBandProps,
  { moduleId: AudioModuleProp }
> = {
  moduleId: {
    kind: "audioModule",
    label: "Audio module",
    shortLabel: "mod",
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
  gain: {
    kind: "number",
    min: 0,
    max: 4,
    step: 0.01,
    label: "Gain",
    shortLabel: "gain",
  },
  smoothing: {
    kind: "number",
    min: 0,
    max: 0.99,
    step: 0.01,
    label: "Smoothing",
    shortLabel: "smooth",
  },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Mean level of one frequency band of an audio module's output, 0..1. The
// host keeps one analyser per referenced module and ships its bins each
// frame; this only averages a slice, so many Bands on one module cost one
// FFT.
export default class Band extends VideoModule<VideoModuleType.Band> {
  readonly inputs = [
    { name: "lowHz", kind: "control" },
    { name: "highHz", kind: "control" },
    { name: "gain", kind: "control" },
  ] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = bandPropSchema;
  private last = 0;

  constructor(params: ICreateVideoModule<VideoModuleType.Band>) {
    super(VideoModuleType.Band, DEFAULT_PROPS, params);
  }

  tick(_values: ControlValues, frame: Frame, props = this.props) {
    const spectrum = frame.spectra?.get(props.moduleId);
    const level = spectrum
      ? bandLevel(spectrum.bins, spectrum.sampleRate, props)
      : 0;
    this.last = this.last * props.smoothing + level * (1 - props.smoothing);

    return { out: this.last };
  }
}

function bandLevel(
  bins: Float32Array,
  sampleRate: number,
  props: IBandProps,
): number {
  if (bins.length === 0) return 0;
  const hzPerBin = sampleRate / (bins.length * 2);
  let from = Math.ceil(props.lowHz / hzPerBin);
  let to = Math.floor(props.highHz / hzPerBin);
  if (from > to) {
    from = to = Math.round((props.lowHz + props.highHz) / 2 / hzPerBin);
  }
  from = Math.max(0, from);
  to = Math.min(bins.length - 1, to);
  if (from > to) return 0;

  let sum = 0;
  for (let i = from; i <= to; i++) sum += bins[i] ?? MIN_DB;
  const meanDb = sum / (to - from + 1);

  return clamp01(clamp01((meanDb - MIN_DB) / (MAX_DB - MIN_DB)) * props.gain);
}
