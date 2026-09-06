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
  spectrumId: string;
  lowHz: number;
  highHz: number;
  gain: number;
  smoothing: number;
};

const DEFAULT_PROPS: IBandProps = {
  spectrumId: "",
  lowHz: 20,
  highHz: 200,
  gain: 1,
  smoothing: 0,
};

// Fallback when the Spectrum's own range has not been mirrored yet; matches
// the audio Spectrum module's defaults.
const MIN_DB = -100;
const MAX_DB = -30;

export const bandPropSchema: ModulePropSchema<
  IBandProps,
  { spectrumId: AudioModuleProp }
> = {
  spectrumId: {
    kind: "audioModule",
    moduleType: "Spectrum",
    label: "Spectrum",
    shortLabel: "spec",
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

// Mean level of one frequency band of a Spectrum module, 0..1. The analysis
// belongs to the Spectrum: this only averages a slice of bins the host
// already read, so many Bands on one Spectrum cost one FFT.
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

  tick(values: ControlValues, frame: Frame, props = this.props) {
    const spectrum = frame.spectra?.get(props.spectrumId);
    const level = spectrum
      ? this.level(spectrum.bins, spectrum.sampleRate, values, props)
      : 0;
    this.last = this.last * props.smoothing + level * (1 - props.smoothing);

    return { out: this.last };
  }

  private level(
    bins: Float32Array,
    sampleRate: number,
    values: ControlValues,
    props: IBandProps,
  ): number {
    if (bins.length === 0) return 0;
    const hzPerBin = sampleRate / (bins.length * 2);
    let from = Math.ceil(props.lowHz / hzPerBin);
    let to = Math.floor(props.highHz / hzPerBin);
    if (from > to) {
      const nearest = Math.round((props.lowHz + props.highHz) / 2 / hzPerBin);
      from = to = nearest;
    }
    from = Math.max(0, from);
    to = Math.min(bins.length - 1, to);
    if (from > to) return 0;

    let sum = 0;
    for (let i = from; i <= to; i++) sum += bins[i] ?? MIN_DB;
    const meanDb = sum / (to - from + 1);

    const minDb = values.get(`patch:${props.spectrumId}:minDecibels`) ?? MIN_DB;
    const maxDb = values.get(`patch:${props.spectrumId}:maxDecibels`) ?? MAX_DB;
    if (maxDb === minDb) return 0;

    return clamp01(clamp01((meanDb - minDb) / (maxDb - minDb)) * props.gain);
  }
}
