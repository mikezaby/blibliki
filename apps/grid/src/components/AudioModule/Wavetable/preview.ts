import { WavetableTable } from "./presets";

export type WavetableInterpolationState = {
  fromIndex: number;
  toIndex: number;
  mix: number;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const sampleWaveform = (
  table: WavetableTable,
  pointCount: number,
): number[] => {
  const harmonics = Math.max(table.real.length, table.imag.length) - 1;
  const samples = Array.from({ length: pointCount }, (_, pointIndex) => {
    const phase =
      pointCount > 1 ? (pointIndex / (pointCount - 1)) * Math.PI * 2 : 0;

    let value = 0;
    for (let harmonic = 1; harmonic <= harmonics; harmonic += 1) {
      const real = table.real[harmonic] ?? 0;
      const imag = table.imag[harmonic] ?? 0;
      value +=
        real * Math.cos(harmonic * phase) + imag * Math.sin(harmonic * phase);
    }

    return value;
  });

  const peak = samples.reduce((max, sample) => {
    return Math.max(max, Math.abs(sample));
  }, 0);

  if (peak === 0) {
    return samples;
  }

  return samples.map((sample) => sample / peak);
};

export const getInterpolationState = (
  position: number,
  tableCount: number,
): WavetableInterpolationState => {
  if (tableCount <= 1) {
    return {
      fromIndex: 0,
      toIndex: 0,
      mix: 0,
    };
  }

  const mapped = clamp(position, 0, 1) * (tableCount - 1);
  const fromIndex = Math.floor(mapped);
  const toIndex = Math.min(fromIndex + 1, tableCount - 1);

  return {
    fromIndex,
    toIndex,
    mix: toIndex === fromIndex ? 0 : mapped - fromIndex,
  };
};

export const buildPreviewWaveforms = (
  tables: WavetableTable[],
  pointCount = 96,
): number[][] => {
  const safePointCount = Math.max(2, Math.floor(pointCount));
  return tables.map((table) => sampleWaveform(table, safePointCount));
};
