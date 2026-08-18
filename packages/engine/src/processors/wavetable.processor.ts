import type {
  ProcessorDefinition,
  ProcessorMessageHandler,
  ProcessFunction,
  ProcessorState,
} from "@blibliki/utils";

// Wavetable oscillator: `process` + `createState` + `onMessage`, each
// self-contained. The module sends the real tables at construction, so
// createState starts with empty frames (brief silence until the first setTables).
type WavetableTable = { real: number[]; imag: number[] };

// State is deliberately FLAT and all-numeric apart from one pre-allocated buffer:
// rendered frames live end-to-end in `frames` (frame f at f*2048). Reassigning a
// nested Float32Array[] member of the captured state object crashed the native
// worklet runtime, so nothing here is ever reassigned — only written in place.
// `positionInitialized` is 0/1 rather than a boolean for the same reason.
type WavetableState = {
  instanceId: number;
  frameCount: number;
  phase: number;
  smoothedPosition: number;
  lastReportedPosition: number;
  samplesSinceReport: number;
  positionInitialized: number;
};

const createWavetableState = (): ProcessorState =>
  ({
    instanceId: 0, // assigned per node by the platform Context
    frameCount: 0,
    phase: 0,
    smoothedPosition: 0,
    lastReportedPosition: 0,
    samplesSinceReport: 0,
    positionInitialized: 0,
  }) satisfies WavetableState;

// JS/main thread: render Fourier tables to normalized frames BEFORE the message
// reaches the worklet. This is ~4M sin/cos ops for a 20-table preset — running it
// on the audio thread blows the ~2.6ms block deadline (CoreAudio overload), so it
// must happen here. Plain function: not a worklet, no self-containment limits.
const wavetablePrepareMessage = (data: unknown): unknown => {
  if (!data || typeof data !== "object") return data;
  const message = data as { type?: unknown; tables?: unknown };
  if (message.type !== "setTables") return data;

  const FRAME_SIZE = 2048;
  const MIN_COEFFICIENT_LENGTH = 2;
  const MAX_HARMONICS = 128;
  const DEFAULT_TABLES = [
    { real: [0, 0], imag: [0, 0] },
    { real: [0, 0], imag: [0, 1] },
  ];

  const sanitizeCoefficients = (values: unknown): number[] => {
    if (!Array.isArray(values)) return [0, 0];
    const sanitized = values
      .map((value) => (Number.isFinite(value) ? Number(value) : 0))
      .slice(0, MAX_HARMONICS);
    if (sanitized.length >= MIN_COEFFICIENT_LENGTH) return sanitized;
    const padding = Array.from(
      { length: MIN_COEFFICIENT_LENGTH - sanitized.length },
      () => 0,
    );
    return [...sanitized, ...padding];
  };

  const sanitizeTable = (table: unknown): WavetableTable => {
    if (!table || typeof table !== "object") {
      return { real: [0, 0], imag: [0, 0] };
    }
    const record = table as { real?: unknown; imag?: unknown };
    const real = sanitizeCoefficients(record.real);
    const imag = sanitizeCoefficients(record.imag);
    const length = Math.max(real.length, imag.length);
    const pad = (values: number[]): number[] =>
      values.length === length
        ? values
        : [
            ...values,
            ...Array.from({ length: length - values.length }, () => 0),
          ];
    return { real: pad(real), imag: pad(imag) };
  };

  const sanitizeTables = (tables: unknown): WavetableTable[] =>
    !Array.isArray(tables) || tables.length === 0
      ? DEFAULT_TABLES.map((table) => sanitizeTable(table))
      : tables.map((table) => sanitizeTable(table));

  const renderFrame = (real: number[], imag: number[]): Float32Array => {
    const frame = new Float32Array(FRAME_SIZE);
    const harmonics = Math.max(real.length, imag.length);
    let peak = 0;
    for (let sampleIndex = 0; sampleIndex < FRAME_SIZE; sampleIndex++) {
      const phase = (sampleIndex / FRAME_SIZE) * Math.PI * 2;
      let sample = 0;
      for (let harmonic = 1; harmonic < harmonics; harmonic++) {
        sample +=
          (real[harmonic] ?? 0) * Math.cos(harmonic * phase) +
          (imag[harmonic] ?? 0) * Math.sin(harmonic * phase);
      }
      frame[sampleIndex] = sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    if (peak > 0) {
      for (let i = 0; i < frame.length; i += 1) {
        const sample = frame[i];
        if (sample === undefined) continue;
        frame[i] = sample / peak;
      }
    }
    return frame;
  };

  return {
    type: "setFrames",
    frames: sanitizeTables(message.tables).map((table) =>
      renderFrame(table.real, table.imag),
    ),
  };
};

// Audio thread: copy the rendered frames into the PRE-ALLOCATED flat buffer.
// Critical for native: never reassign members of the captured state object (a
// nested Float32Array[] reassigned here crashed the worklet runtime). Instead
// state keeps one flat buffer, written in place — the same pattern the params map
// uses. Frames are laid out end-to-end: frame f occupies [f*FRAME_SIZE, ...).
const wavetableOnMessage: ProcessorMessageHandler = (data, state) => {
  if (!data || typeof data !== "object") return;
  const message = data as { type?: unknown; frames?: unknown };
  if (message.type !== "setFrames" || !Array.isArray(message.frames)) return;

  const s = state as unknown as { instanceId: number; frameCount: number };
  const incoming = message.frames as ArrayLike<number>[];

  // Bulk data lives on the WORKLET RUNTIME'S OWN GLOBAL, never in the captured
  // state object: state is serialized across the runtime boundary, and reading a
  // buffer from it on the audio thread crashes natively at any size. Copying into
  // runtime-owned Float32Arrays here keeps every later read purely local.
  // (On web this global is the AudioWorkletGlobalScope — same code, same result.)
  const store = globalThis as unknown as Record<string, Float32Array[]>;
  const key = "__blibliki_wt_" + String(s.instanceId);
  const frames: Float32Array[] = [];
  for (const frame of incoming) {
    const copy = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) copy[i] = frame[i]!;
    frames.push(copy);
  }
  store[key] = frames;
  s.frameCount = frames.length;
};

const wavetableProcess: ProcessFunction = (
  _inputs,
  outputs,
  framesToProcess,
  params,
  state,
  ctx,
) => {
  const output = outputs;
  if (output.length === 0) return;

  const frequencyValues = params.frequency;
  const detuneValues = params.detune;
  const positionValues = params.position;
  const activeValues = params.active;
  if (!frequencyValues || !detuneValues || !positionValues || !activeValues) {
    return;
  }

  const FRAME_SIZE = 2048;
  const POSITION_SMOOTHING_TIME_SECONDS = 0.06;
  const POSITION_REPORT_EPSILON = 0.001;
  const POSITION_REPORT_INTERVAL_SECONDS = 1 / 30;
  const sampleRate = ctx.sampleRate;

  // All-numeric state plus the one pre-allocated frames buffer. Read into locals,
  // write back at the end. No closures are defined in this function (they were
  // ~1100 allocations/sec on the audio thread).
  const s = state as unknown as {
    instanceId: number;
    frameCount: number;
    phase: number;
    smoothedPosition: number;
    lastReportedPosition: number;
    samplesSinceReport: number;
    positionInitialized: number;
  };
  const store = globalThis as unknown as Record<
    string,
    Float32Array[] | undefined
  >;
  const frames = store["__blibliki_wt_" + String(s.instanceId)];
  const frameCount = frames ? frames.length : 0;
  let phase = s.phase;
  let smoothedPosition = s.smoothedPosition;
  let lastReportedPosition = s.lastReportedPosition;
  let samplesSinceReport = s.samplesSinceReport;
  let positionInitialized = s.positionInitialized;

  const positionSmoothingAlpha =
    1 -
    Math.exp(-1 / Math.max(1, sampleRate * POSITION_SMOOTHING_TIME_SECONDS));
  const reportIntervalSamples = Math.max(
    1,
    Math.floor(sampleRate * POSITION_REPORT_INTERVAL_SECONDS),
  );

  const blockSize = framesToProcess;
  let hasActiveSample = false;

  for (let i = 0; i < blockSize; i += 1) {
    const active =
      activeValues.length > 1
        ? (activeValues[i] ?? activeValues[0] ?? 0)
        : (activeValues[0] ?? 0);
    if (active <= 0.5) {
      positionInitialized = 0;
      for (const channel of output) channel[i] = 0;
      continue;
    }

    hasActiveSample = true;

    const frequency =
      frequencyValues.length > 1
        ? (frequencyValues[i] ?? frequencyValues[0] ?? 440)
        : (frequencyValues[0] ?? 440);
    const detuneCents =
      detuneValues.length > 1
        ? (detuneValues[i] ?? detuneValues[0] ?? 0)
        : (detuneValues[0] ?? 0);
    const rawPosition =
      positionValues.length > 1
        ? (positionValues[i] ?? positionValues[0] ?? 0)
        : (positionValues[0] ?? 0);
    const targetPosition = Math.min(1, Math.max(0, rawPosition));

    if (positionInitialized === 0) {
      smoothedPosition = targetPosition;
      lastReportedPosition = targetPosition;
      positionInitialized = 1;
    } else {
      smoothedPosition +=
        (targetPosition - smoothedPosition) * positionSmoothingAlpha;
    }

    // Inlined wavetable lookup: linear interpolation within a frame, then between
    // the two frames adjacent to `position`.
    let sample = 0;
    if (frameCount > 0) {
      const safePhase = phase - Math.floor(phase);
      const index = safePhase * FRAME_SIZE;
      const baseIndex = Math.floor(index);
      const nextIndex = (baseIndex + 1) % FRAME_SIZE;
      const t = index - baseIndex;

      const mapped = smoothedPosition * (frameCount - 1);
      const fromFrame = Math.floor(mapped);
      const toFrame = Math.min(fromFrame + 1, frameCount - 1);
      const mix = mapped - fromFrame;

      const fromBuf = frames![fromFrame]!;
      const fromA = fromBuf[baseIndex] ?? 0;
      const fromB = fromBuf[nextIndex] ?? 0;
      const fromSample = fromA + (fromB - fromA) * t;

      if (toFrame === fromFrame || mix === 0) {
        sample = fromSample;
      } else {
        const toBuf = frames![toFrame]!;
        const toA = toBuf[baseIndex] ?? 0;
        const toB = toBuf[nextIndex] ?? 0;
        const toSample = toA + (toB - toA) * t;
        sample = fromSample + (toSample - fromSample) * mix;
      }
    }

    for (const channel of output) channel[i] = sample;

    const transposedFrequency = Math.max(
      0,
      frequency * Math.pow(2, detuneCents / 1200),
    );
    phase += transposedFrequency / sampleRate;
    if (phase >= 1 || phase < 0) phase -= Math.floor(phase);
  }

  s.phase = phase;
  s.smoothedPosition = smoothedPosition;
  s.positionInitialized = positionInitialized;

  if (!hasActiveSample) {
    s.samplesSinceReport = 0;
    s.lastReportedPosition = lastReportedPosition;
    return;
  }

  samplesSinceReport += blockSize;
  if (
    Math.abs(smoothedPosition - lastReportedPosition) >
      POSITION_REPORT_EPSILON ||
    samplesSinceReport >= reportIntervalSamples
  ) {
    lastReportedPosition = smoothedPosition;
    samplesSinceReport = 0;
    ctx.post({ type: "actualPosition", value: smoothedPosition });
  }

  s.samplesSinceReport = samplesSinceReport;
  s.lastReportedPosition = lastReportedPosition;
};

const wavetableProcessor: ProcessorDefinition = {
  name: "wavetable-processor",
  parameterDescriptors: [
    { name: "frequency", defaultValue: 440, minValue: 0, maxValue: 25000 },
    { name: "detune", defaultValue: 0, minValue: -4800, maxValue: 4800 },
    { name: "position", defaultValue: 0, minValue: 0, maxValue: 1 },
    { name: "active", defaultValue: 0, minValue: 0, maxValue: 1 },
  ],
  process: wavetableProcess,
  createState: createWavetableState,
  onMessage: wavetableOnMessage,
  prepareMessage: wavetablePrepareMessage,
};

export default wavetableProcessor;
