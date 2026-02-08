export type WavetableTable = {
  real: number[];
  imag: number[];
};

const DEFAULT_TABLE_COUNT = 32;
const DEFAULT_FRAME_SIZE = 2048;
const DEFAULT_HARMONICS = 1024;
const DEFAULT_EXPORT_SAMPLE_RATE = 44100;
const DEFAULT_EXPORT_DURATION_SECONDS = 2;
const DEFAULT_EXPORT_FREQUENCY = 110;
const DEFAULT_EXPORT_FRAME_SAMPLES = 2048;
const TWO_PI = Math.PI * 2;
const WAVETABLE_METADATA_CHUNK_ID = "WTBL";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type ExtractWavetableOptions = {
  tableCount?: number;
  frameSize?: number;
  harmonics?: number;
};

export type RenderWavetableScanOptions = {
  tables: WavetableTable[];
  sampleRate?: number;
  durationSeconds?: number;
  frequency?: number;
  frameSampleCount?: number;
};

type WavChunk = {
  id: string;
  data: Uint8Array;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const isPowerOfTwo = (value: number): boolean => {
  return value > 0 && (value & (value - 1)) === 0;
};

const readAscii = (
  bytes: Uint8Array,
  offset: number,
  length: number,
): string => {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
};

const isFiniteNumberArray = (value: unknown): value is number[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
};

const parseWavetableTablesPayload = (
  payload: unknown,
): WavetableTable[] | null => {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as { tables?: unknown };
  if (!Array.isArray(candidate.tables)) return null;

  const tables: WavetableTable[] = [];
  for (const table of candidate.tables) {
    if (!table || typeof table !== "object") return null;
    const tableRecord = table as { real?: unknown; imag?: unknown };

    if (
      !isFiniteNumberArray(tableRecord.real) ||
      !isFiniteNumberArray(tableRecord.imag)
    ) {
      return null;
    }

    tables.push({
      real: [...tableRecord.real],
      imag: [...tableRecord.imag],
    });
  }

  return tables;
};

const normalizeExtractOptions = (
  options: ExtractWavetableOptions = {},
): Required<ExtractWavetableOptions> => {
  const tableCount = Math.max(
    1,
    Math.floor(options.tableCount ?? DEFAULT_TABLE_COUNT),
  );
  const frameSize = Math.max(
    2,
    Math.floor(options.frameSize ?? DEFAULT_FRAME_SIZE),
  );

  if (!isPowerOfTwo(frameSize)) {
    throw new Error("frameSize must be a power of two");
  }

  const maxHarmonics = frameSize / 2;
  const harmonics = clamp(
    Math.floor(options.harmonics ?? DEFAULT_HARMONICS),
    2,
    maxHarmonics,
  );

  return {
    tableCount,
    frameSize,
    harmonics,
  };
};

const hann = (index: number, size: number): number => {
  if (size <= 1) return 1;
  return 0.5 * (1 - Math.cos((TWO_PI * index) / (size - 1)));
};

const fftInPlace = (real: Float32Array, imag: Float32Array) => {
  const size = real.length;

  let j = 0;
  for (let i = 0; i < size; i += 1) {
    if (i < j) {
      const realTemp = real[i] ?? 0;
      const imagTemp = imag[i] ?? 0;
      real[i] = real[j] ?? 0;
      imag[i] = imag[j] ?? 0;
      real[j] = realTemp;
      imag[j] = imagTemp;
    }

    let bit = size >> 1;
    while (bit > 0 && (j & bit) !== 0) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
  }

  for (let len = 2; len <= size; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -TWO_PI / len;
    const wLenReal = Math.cos(angle);
    const wLenImag = Math.sin(angle);

    for (let i = 0; i < size; i += len) {
      let wReal = 1;
      let wImag = 0;

      for (let k = 0; k < halfLen; k += 1) {
        const uReal = real[i + k] ?? 0;
        const uImag = imag[i + k] ?? 0;
        const vIndex = i + k + halfLen;
        const vRealRaw = real[vIndex] ?? 0;
        const vImagRaw = imag[vIndex] ?? 0;
        const vReal = vRealRaw * wReal - vImagRaw * wImag;
        const vImag = vRealRaw * wImag + vImagRaw * wReal;

        real[i + k] = uReal + vReal;
        imag[i + k] = uImag + vImag;
        real[vIndex] = uReal - vReal;
        imag[vIndex] = uImag - vImag;

        const nextWReal = wReal * wLenReal - wImag * wLenImag;
        const nextWImag = wReal * wLenImag + wImag * wLenReal;
        wReal = nextWReal;
        wImag = nextWImag;
      }
    }
  }
};

export const extractWavetableTablesFromSamples = (
  sourceSamples: Float32Array,
  options: ExtractWavetableOptions = {},
): WavetableTable[] => {
  if (!sourceSamples.length) {
    throw new Error("WAV source has no samples");
  }

  const { tableCount, frameSize, harmonics } = normalizeExtractOptions(options);
  const maxStart = Math.max(0, sourceSamples.length - frameSize);
  const tables: WavetableTable[] = [];

  for (let tableIndex = 0; tableIndex < tableCount; tableIndex += 1) {
    const start =
      tableCount === 1
        ? 0
        : Math.round((tableIndex * maxStart) / (tableCount - 1));
    const real = new Float32Array(frameSize);
    const imag = new Float32Array(frameSize);

    for (let sampleIndex = 0; sampleIndex < frameSize; sampleIndex += 1) {
      const sample = sourceSamples[start + sampleIndex] ?? 0;
      real[sampleIndex] = sample * hann(sampleIndex, frameSize);
      imag[sampleIndex] = 0;
    }

    fftInPlace(real, imag);

    const scale = 1 / frameSize;
    tables.push({
      real: Array.from({ length: harmonics }, (_, harmonic) => {
        return (real[harmonic] ?? 0) * scale;
      }),
      imag: Array.from({ length: harmonics }, (_, harmonic) => {
        return (imag[harmonic] ?? 0) * scale;
      }),
    });
  }

  return tables;
};

export const extractWavetableTablesFromAudioBuffer = (
  audioBuffer: AudioBuffer,
  options: ExtractWavetableOptions = {},
): WavetableTable[] => {
  const channelCount = Math.max(1, audioBuffer.numberOfChannels);
  const mono = new Float32Array(audioBuffer.length);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let sampleIndex = 0; sampleIndex < mono.length; sampleIndex += 1) {
      const current = mono[sampleIndex] ?? 0;
      mono[sampleIndex] =
        current + (channelData[sampleIndex] ?? 0) / channelCount;
    }
  }

  return extractWavetableTablesFromSamples(mono, options);
};

export const extractEmbeddedWavetableTablesFromWavBytes = (
  wavBytes: Uint8Array,
): WavetableTable[] | null => {
  if (wavBytes.length < 12) return null;
  if (readAscii(wavBytes, 0, 4) !== "RIFF") return null;
  if (readAscii(wavBytes, 8, 4) !== "WAVE") return null;

  const view = new DataView(
    wavBytes.buffer,
    wavBytes.byteOffset,
    wavBytes.byteLength,
  );
  let offset = 12;

  while (offset + 8 <= wavBytes.length) {
    const chunkId = readAscii(wavBytes, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkSize;
    if (dataEnd > wavBytes.length) return null;

    if (chunkId === WAVETABLE_METADATA_CHUNK_ID) {
      try {
        const payloadText = textDecoder.decode(
          wavBytes.slice(dataOffset, dataEnd),
        );
        const payload = JSON.parse(payloadText) as unknown;
        return parseWavetableTablesPayload(payload);
      } catch {
        return null;
      }
    }

    offset = dataEnd + (chunkSize % 2);
  }

  return null;
};

const getRenderHarmonicCount = (tables: WavetableTable[]): number => {
  return tables.reduce((max, table) => {
    return Math.max(max, table.real.length, table.imag.length);
  }, 2);
};

const getInterpolatedCoefficient = (
  from: number,
  to: number,
  mix: number,
): number => {
  return from + (to - from) * mix;
};

const renderSingleCycleFromTable = (
  table: WavetableTable,
  frameSampleCount: number,
): Float32Array => {
  const output = new Float32Array(frameSampleCount);
  const harmonics = Math.max(table.real.length, table.imag.length);

  for (let sampleIndex = 0; sampleIndex < frameSampleCount; sampleIndex += 1) {
    const phase = (TWO_PI * sampleIndex) / frameSampleCount;
    let value = 0;

    for (let harmonic = 0; harmonic < harmonics; harmonic += 1) {
      value +=
        (table.real[harmonic] ?? 0) * Math.cos(harmonic * phase) +
        (table.imag[harmonic] ?? 0) * Math.sin(harmonic * phase);
    }

    output[sampleIndex] = value;
  }

  return output;
};

const normalizeSamplesInPlace = (samples: Float32Array) => {
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }

  if (peak <= 0 || peak <= 1) return;
  const gain = 1 / peak;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (samples[i] ?? 0) * gain;
  }
};

export const renderWavetableFrameSequenceSamples = (
  tables: WavetableTable[],
  frameSampleCount = DEFAULT_EXPORT_FRAME_SAMPLES,
): Float32Array => {
  if (!tables.length) {
    throw new Error("Cannot render frame sequence without wavetable tables");
  }

  const safeFrameSize = Math.max(64, Math.floor(frameSampleCount));
  const output = new Float32Array(tables.length * safeFrameSize);

  tables.forEach((table, tableIndex) => {
    const cycle = renderSingleCycleFromTable(table, safeFrameSize);
    output.set(cycle, tableIndex * safeFrameSize);
  });

  normalizeSamplesInPlace(output);
  return output;
};

export const renderWavetableScanSamples = (
  options: RenderWavetableScanOptions,
): Float32Array => {
  const sampleRate = Math.max(
    1000,
    Math.floor(options.sampleRate ?? DEFAULT_EXPORT_SAMPLE_RATE),
  );
  const durationSeconds = Math.max(
    0.05,
    options.durationSeconds ?? DEFAULT_EXPORT_DURATION_SECONDS,
  );
  const frequency = Math.max(1, options.frequency ?? DEFAULT_EXPORT_FREQUENCY);
  const tables = options.tables;

  if (!tables.length) {
    throw new Error("Cannot render WAV without wavetable tables");
  }

  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const harmonicCount = getRenderHarmonicCount(tables);
  const output = new Float32Array(totalSamples);
  const maxTableIndex = Math.max(0, tables.length - 1);
  const phaseIncrement = (TWO_PI * frequency) / sampleRate;
  let phase = 0;

  for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
    const position = totalSamples > 1 ? sampleIndex / (totalSamples - 1) : 0;
    const mapped = position * maxTableIndex;
    const fromIndex = Math.floor(mapped);
    const toIndex = Math.min(fromIndex + 1, maxTableIndex);
    const mix = mapped - fromIndex;
    const fromTable = tables[fromIndex] ?? tables[0]!;
    const toTable = tables[toIndex] ?? fromTable;

    let value = 0;
    for (let harmonic = 0; harmonic < harmonicCount; harmonic += 1) {
      const real = getInterpolatedCoefficient(
        fromTable.real[harmonic] ?? 0,
        toTable.real[harmonic] ?? 0,
        mix,
      );
      const imag = getInterpolatedCoefficient(
        fromTable.imag[harmonic] ?? 0,
        toTable.imag[harmonic] ?? 0,
        mix,
      );
      const harmonicPhase = harmonic * phase;
      value += real * Math.cos(harmonicPhase) + imag * Math.sin(harmonicPhase);
    }

    output[sampleIndex] = clamp(value, -1, 1);
    phase += phaseIncrement;
    if (phase >= TWO_PI) {
      phase -= TWO_PI;
    }
  }

  return output;
};

export const encodeWavPcm16 = (
  samples: Float32Array,
  sampleRate: number,
  options: { extraChunks?: WavChunk[] } = {},
): Uint8Array => {
  const safeRate = Math.max(1000, Math.floor(sampleRate));
  const bytesPerSample = 2;
  const headerSize = 44;
  const dataSize = samples.length * bytesPerSample;
  const extraChunks = options.extraChunks ?? [];
  const extraSize = extraChunks.reduce((total, chunk) => {
    const chunkDataSize = chunk.data.byteLength;
    const paddedSize = chunkDataSize + (chunkDataSize % 2);
    return total + 8 + paddedSize;
  }, 0);
  const totalSize = headerSize + dataSize + extraSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, safeRate, true);
  view.setUint32(28, safeRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const currentSample of samples) {
    const sample = clamp(currentSample, -1, 1);
    const scaled =
      sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(offset, scaled, true);
    offset += 2;
  }

  for (const chunk of extraChunks) {
    if (chunk.id.length !== 4) {
      throw new Error("WAV chunk id must be exactly 4 characters");
    }

    writeString(offset, chunk.id);
    view.setUint32(offset + 4, chunk.data.byteLength, true);
    new Uint8Array(buffer, offset + 8, chunk.data.byteLength).set(chunk.data);
    offset += 8 + chunk.data.byteLength;

    if (chunk.data.byteLength % 2 === 1) {
      view.setUint8(offset, 0);
      offset += 1;
    }
  }

  return new Uint8Array(buffer);
};

export const exportWavetableScanToWavBytes = (
  options: RenderWavetableScanOptions,
): Uint8Array => {
  const sampleRate = Math.max(
    1000,
    Math.floor(options.sampleRate ?? DEFAULT_EXPORT_SAMPLE_RATE),
  );
  const samples = renderWavetableFrameSequenceSamples(
    options.tables,
    options.frameSampleCount ?? DEFAULT_EXPORT_FRAME_SAMPLES,
  );
  const metadataChunk: WavChunk = {
    id: WAVETABLE_METADATA_CHUNK_ID,
    data: textEncoder.encode(JSON.stringify({ tables: options.tables })),
  };

  return encodeWavPcm16(samples, sampleRate, {
    extraChunks: [metadataChunk],
  });
};
