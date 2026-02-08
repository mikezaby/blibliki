export type WavetableTable = {
  real: number[];
  imag: number[];
};

export type WavetablePreset = {
  id: string;
  name: string;
  description?: string;
  tables: WavetableTable[];
};

type HarmonicShape = {
  tableCount?: number;
  harmonicCount?: number;
  amplitude: (harmonic: number, position: number) => number;
  phase?: (harmonic: number, position: number) => number;
};

const DEFAULT_TABLE_COUNT = 16;
const DEFAULT_HARMONIC_COUNT = 48;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const createTablesFromShape = ({
  tableCount = DEFAULT_TABLE_COUNT,
  harmonicCount = DEFAULT_HARMONIC_COUNT,
  amplitude,
  phase,
}: HarmonicShape): WavetableTable[] => {
  return Array.from({ length: tableCount }, (_, tableIndex) => {
    const position = tableCount > 1 ? tableIndex / (tableCount - 1) : 0;
    const real = Array.from({ length: harmonicCount + 1 }, () => 0);
    const imag = Array.from({ length: harmonicCount + 1 }, () => 0);

    for (let harmonic = 1; harmonic <= harmonicCount; harmonic += 1) {
      const amp = clamp(amplitude(harmonic, position), 0, 1);
      const currentPhase = phase ? phase(harmonic, position) : 0;

      real[harmonic] = amp * Math.sin(currentPhase);
      imag[harmonic] = amp * Math.cos(currentPhase);
    }

    return { real, imag };
  });
};

const PRESET_DEFINITIONS: (Omit<WavetablePreset, "tables"> & HarmonicShape)[] =
  [
    {
      id: "warm-morph",
      name: "Warm Morph",
      description: "Sine to warm saw transition",
      amplitude: (harmonic, position) => {
        if (harmonic === 1) return 1;
        return (position * 0.75) / harmonic;
      },
    },
    {
      id: "triangle-bloom",
      name: "Triangle Bloom",
      description: "Odd harmonics with brightening tail",
      amplitude: (harmonic, position) => {
        if (harmonic % 2 === 0) return 0;
        const oddSlope = 1 / (harmonic * harmonic);
        return oddSlope * (1 + position * 1.8);
      },
    },
    {
      id: "saw-drive",
      name: "Saw Drive",
      description: "Progressive high-end saw growth",
      amplitude: (harmonic, position) => {
        const cutoff = 8 + Math.floor(position * 30);
        if (harmonic > cutoff) return 0;
        return (1 / harmonic) * (0.65 + position * 0.35);
      },
    },
    {
      id: "square-tilt",
      name: "Square Tilt",
      description: "Square base with evolving tilt",
      amplitude: (harmonic, position) => {
        if (harmonic % 2 === 0) return 0;
        return 1 / Math.pow(harmonic, 1.2 + position * 1.5);
      },
    },
    {
      id: "hollow-shift",
      name: "Hollow Shift",
      description: "Band-notch hollow movement",
      amplitude: (harmonic, position) => {
        const center = 6 + position * 18;
        const distance = Math.abs(harmonic - center);
        return (1 / harmonic) * (distance > 3 ? 1 : distance / 3);
      },
    },
    {
      id: "glass-bell",
      name: "Glass Bell",
      description: "Bell-like inharmonic shimmer",
      amplitude: (harmonic, position) => {
        const inharmonic = (Math.sin(harmonic * 1.7 + position * 4) + 1) * 0.5;
        return (inharmonic * (0.5 + position * 0.5)) / Math.sqrt(harmonic);
      },
      phase: (harmonic, position) =>
        harmonic * 0.14 + position * harmonic * 0.08,
    },
    {
      id: "drawbar-organ",
      name: "Drawbar Organ",
      description: "Organ-like additive mix",
      amplitude: (harmonic, position) => {
        const drawbars = [
          { harmonic: 1, level: 0.9 },
          { harmonic: 2, level: 0.45 + position * 0.2 },
          { harmonic: 3, level: 0.5 - position * 0.2 },
          { harmonic: 4, level: 0.2 + position * 0.25 },
          { harmonic: 6, level: 0.25 },
          { harmonic: 8, level: 0.15 + position * 0.25 },
        ];

        const match = drawbars.find((item) => item.harmonic === harmonic);
        return match?.level ?? 0;
      },
    },
    {
      id: "vowel-sweep",
      name: "Vowel Sweep",
      description: "Moving formant-inspired timbre",
      amplitude: (harmonic, position) => {
        const f1 = 4 + position * 4;
        const f2 = 10 + position * 8;
        const f3 = 18 + position * 10;
        const band =
          Math.exp(-Math.pow((harmonic - f1) / 2.8, 2)) * 0.8 +
          Math.exp(-Math.pow((harmonic - f2) / 3.6, 2)) * 0.55 +
          Math.exp(-Math.pow((harmonic - f3) / 4.2, 2)) * 0.35;

        return band / Math.pow(harmonic, 0.15);
      },
      phase: (harmonic, position) => position * harmonic * 0.05,
    },
    {
      id: "metal-edge",
      name: "Metal Edge",
      description: "Brighter metallic upper partials",
      amplitude: (harmonic, position) => {
        const emphasis = 0.3 + position * 0.7;
        return (
          (Math.pow(harmonic / DEFAULT_HARMONIC_COUNT, 0.7) * emphasis) / 2
        );
      },
      phase: (harmonic, position) => harmonic * 0.22 + position * 1.6,
    },
    {
      id: "chorus-strings-lite",
      name: "Chorus Strings Lite",
      description: "Soft ensemble-like spread",
      amplitude: (harmonic, position) => {
        if (harmonic === 1) return 1;

        const even = harmonic % 2 === 0 ? 1 : 0.75;
        const spread =
          0.6 + 0.4 * Math.sin(position * Math.PI * 2 + harmonic * 0.4);
        return (even * spread) / Math.pow(harmonic, 0.9);
      },
      phase: (harmonic, position) =>
        Math.sin(position * Math.PI * 2) * harmonic * 0.03,
    },
    {
      id: "phase-shatter",
      name: "Phase Shatter",
      description: "Quantized phase jumps with discontinuous harmonic blocks",
      tableCount: 20,
      amplitude: (harmonic, position) => {
        const step = Math.floor(position * 20);
        const block = step % 4;

        if (block === 0) {
          return harmonic <= 6 ? 1 / Math.max(1, harmonic * 0.9) : 0;
        }
        if (block === 1) {
          if (harmonic < 7 || harmonic > 16) return 0;
          return 0.95 / Math.max(1, harmonic - 6);
        }
        if (block === 2) {
          return harmonic % 2 === 0 ? 0.9 / Math.sqrt(harmonic) : 0;
        }

        return harmonic % 3 === 0 ? 0.85 / Math.max(1, harmonic / 2) : 0;
      },
      phase: (harmonic, position) => {
        const step = Math.floor(position * 20);
        return (step % 2 === 0 ? 0 : Math.PI) + harmonic * ((step % 5) * 0.18);
      },
    },
    {
      id: "comb-breaker",
      name: "Comb Breaker",
      description: "Moving comb notches with brutal bucket transitions",
      tableCount: 18,
      amplitude: (harmonic, position) => {
        const step = Math.floor(position * 18);
        const bucket = step % 6;

        if (harmonic % 6 === bucket) {
          return 0.02;
        }

        if (bucket % 2 === 0) {
          return harmonic % 2 === 0 ? 0.92 / Math.max(1, harmonic * 0.6) : 0;
        }

        return harmonic % 2 === 1 ? 0.92 / Math.max(1, harmonic * 0.55) : 0;
      },
      phase: (harmonic, position) => {
        const step = Math.floor(position * 18);
        const polarity = step % 3 === 0 ? 1 : -1;
        return polarity * harmonic * 0.3;
      },
    },
    {
      id: "mirror-jumps",
      name: "Mirror Jumps",
      description: "Alternating mirrored spectra per-step",
      tableCount: 22,
      amplitude: (harmonic, position) => {
        const step = Math.floor(position * 22);
        const mirroredHarmonic = 49 - harmonic;
        const isEven = step % 2 === 0;

        if (isEven) {
          return harmonic <= 12 ? 0.95 / harmonic : 0;
        }

        if (mirroredHarmonic <= 12) {
          return 0.95 / Math.max(1, mirroredHarmonic);
        }

        return 0;
      },
      phase: (harmonic, position) => {
        const step = Math.floor(position * 22);
        return step % 2 === 0 ? harmonic * 0.04 : Math.PI - harmonic * 0.04;
      },
    },
  ];

export const WAVETABLE_PRESETS: WavetablePreset[] = PRESET_DEFINITIONS.map(
  (preset) => {
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      tables: createTablesFromShape(preset),
    };
  },
);

export const clonePresetTables = (
  tables: WavetableTable[],
): WavetableTable[] => {
  return tables.map((table) => ({
    real: [...table.real],
    imag: [...table.imag],
  }));
};

export const getPresetById = (
  presetId: string,
): WavetablePreset | undefined => {
  return WAVETABLE_PRESETS.find((preset) => preset.id === presetId);
};

const COEFFICIENT_TOLERANCE = 1e-6;

const areArraysEquivalent = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;

  return a.every((value, index) => {
    return Math.abs(value - b[index]!) <= COEFFICIENT_TOLERANCE;
  });
};

const areTablesEquivalent = (
  a: WavetableTable[],
  b: WavetableTable[],
): boolean => {
  if (a.length !== b.length) return false;

  return a.every((table, index) => {
    const other = b[index];
    if (!other) return false;

    return (
      areArraysEquivalent(table.real, other.real) &&
      areArraysEquivalent(table.imag, other.imag)
    );
  });
};

export const getPresetIdByTables = (
  tables: WavetableTable[],
): string | undefined => {
  return WAVETABLE_PRESETS.find((preset) =>
    areTablesEquivalent(preset.tables, tables),
  )?.id;
};
