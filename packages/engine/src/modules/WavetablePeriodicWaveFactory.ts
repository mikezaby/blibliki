const MIN_COEFFICIENT_LENGTH = 2;
const MAX_HARMONICS = 128;

export type WavetablePeriodicWaveTable = {
  real: number[];
  imag: number[];
};

export type WavetablePeriodicWaveAudioContext = {
  createPeriodicWave: (
    real: Float32Array,
    imag: Float32Array,
    constraints?: PeriodicWaveConstraints,
  ) => PeriodicWave;
};

export type WavetablePeriodicWaveFactoryOptions = {
  audioContext: WavetablePeriodicWaveAudioContext;
  tables: WavetablePeriodicWaveTable[];
  disableNormalization: boolean;
};

export const DEFAULT_WAVETABLE_TABLES: WavetablePeriodicWaveTable[] = [
  { real: [0, 0], imag: [0, 0] },
  { real: [0, 0], imag: [0, 1] },
];

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const sanitizeCoefficients = (values: number[]): number[] => {
  const sanitized = values
    .map((value) => (Number.isFinite(value) ? value : 0))
    .slice(0, MAX_HARMONICS);

  if (sanitized.length >= MIN_COEFFICIENT_LENGTH) {
    return sanitized;
  }

  const padding = Array.from(
    { length: MIN_COEFFICIENT_LENGTH - sanitized.length },
    () => 0,
  );

  return [...sanitized, ...padding];
};

const normalizeCoefficientPair = (
  real: number[],
  imag: number[],
): { real: number[]; imag: number[] } => {
  const nextReal = sanitizeCoefficients(real);
  const nextImag = sanitizeCoefficients(imag);
  const targetLength = Math.max(nextReal.length, nextImag.length);
  const realPadding = Array.from(
    { length: targetLength - nextReal.length },
    () => 0,
  );
  const imagPadding = Array.from(
    { length: targetLength - nextImag.length },
    () => 0,
  );

  return {
    real: [...nextReal, ...realPadding],
    imag: [...nextImag, ...imagPadding],
  };
};

const sanitizeWavetableTable = (
  table: WavetablePeriodicWaveTable,
): WavetablePeriodicWaveTable => {
  const { real, imag } = normalizeCoefficientPair(table.real, table.imag);
  return { real, imag };
};

export const sanitizeWavetableTables = (
  tables: WavetablePeriodicWaveTable[],
): WavetablePeriodicWaveTable[] => {
  if (!tables.length) {
    return DEFAULT_WAVETABLE_TABLES.map((table) =>
      sanitizeWavetableTable(table),
    );
  }

  return tables.map((table) => sanitizeWavetableTable(table));
};

const blendWavetableTables = (
  from: WavetablePeriodicWaveTable,
  to: WavetablePeriodicWaveTable,
  t: number,
): WavetablePeriodicWaveTable => {
  const normalizedFrom = sanitizeWavetableTable(from);
  const normalizedTo = sanitizeWavetableTable(to);
  const length = Math.max(normalizedFrom.real.length, normalizedTo.real.length);

  const blend = (fromValues: number[], toValues: number[]) => {
    return Array.from({ length }, (_, index) => {
      const fromValue = fromValues[index] ?? 0;
      const toValue = toValues[index] ?? 0;
      return fromValue + (toValue - fromValue) * t;
    });
  };

  return {
    real: blend(normalizedFrom.real, normalizedTo.real),
    imag: blend(normalizedFrom.imag, normalizedTo.imag),
  };
};

export class WavetablePeriodicWaveFactory {
  private tables: WavetablePeriodicWaveTable[];
  private disableNormalization: boolean;
  private readonly periodicWaveCache = new Map<string, PeriodicWave>();

  constructor(private readonly options: WavetablePeriodicWaveFactoryOptions) {
    this.tables = sanitizeWavetableTables(options.tables);
    this.disableNormalization = options.disableNormalization;
  }

  setTables(tables: WavetablePeriodicWaveTable[]) {
    this.tables = sanitizeWavetableTables(tables);
    this.clearCache();
  }

  setDisableNormalization(disableNormalization: boolean) {
    if (this.disableNormalization === disableNormalization) return;

    this.disableNormalization = disableNormalization;
    this.clearCache();
  }

  clearCache() {
    this.periodicWaveCache.clear();
  }

  getPeriodicWave(position: number): PeriodicWave {
    const cacheKey = this.toCacheKey(position);
    const cachedWave = this.periodicWaveCache.get(cacheKey);
    if (cachedWave) {
      return cachedWave;
    }

    const processed = this.getInterpolatedTable(position);
    const periodicWave = this.options.audioContext.createPeriodicWave(
      new Float32Array(processed.real),
      new Float32Array(processed.imag),
      {
        disableNormalization: this.disableNormalization,
      },
    );

    this.periodicWaveCache.set(cacheKey, periodicWave);
    return periodicWave;
  }

  private getInterpolatedTable(position: number): WavetablePeriodicWaveTable {
    if (this.tables.length === 1) return this.tables[0]!;

    const mapped = clamp(position, 0, 1) * (this.tables.length - 1);
    const startIndex = Math.floor(mapped);
    const endIndex = Math.min(startIndex + 1, this.tables.length - 1);
    const factor = mapped - startIndex;

    return blendWavetableTables(
      this.tables[startIndex]!,
      this.tables[endIndex]!,
      factor,
    );
  }

  private toCacheKey(position: number): string {
    return (position * 1000).toFixed(0);
  }
}
