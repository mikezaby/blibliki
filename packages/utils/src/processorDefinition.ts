// The contract for a custom audio processor.
//
// A processor is authored ONCE as a `ProcessorDefinition`: a top-level `process`
// function plus optional `createState` / `onMessage` / `prepareMessage`. The
// engine packages a definition into an AudioWorklet module (see the engine's
// webProcessorBlob), which is why `process`, `createState` and `onMessage` MUST
// be self-contained — their source is embedded into the worklet, so they cannot
// reference imports or module-scope values.

export type ProcessorParamDescriptor = {
  name: string;
  defaultValue: number;
  minValue?: number;
  maxValue?: number;
  automationRate?: "a-rate" | "k-rate";
};

// Per-instance mutable state for stateful processors (filter history, LFO phase,
// wavetable frames, ...). Seeded by `createState` and mutated in place across
// blocks. Values are `unknown` so state can hold non-numeric data (e.g.
// Float32Array); processors cast it to their own shape.
export type ProcessorState = Record<string, unknown>;

export type ProcessorContext = {
  sampleRate: number;
  currentFrame: number; // global sample counter
  // Send a message to the main thread (AudioWorkletNode.port). Used for
  // processor -> module feedback, e.g. the wavetable's position report or the
  // recorder's audio chunks.
  post: (message: unknown, transfer?: unknown[]) => void;
};

// The per-block DSP. Runs on the audio thread. `params` mirrors the AudioParam
// map (each value a Float32Array: length 1 for k-rate, block-length for a-rate).
// `state` is mutated in place to persist across blocks.
export type ProcessFunction = (
  inputs: Float32Array[],
  outputs: Float32Array[],
  framesToProcess: number,
  params: Record<string, Float32Array>,
  state: ProcessorState,
  ctx: ProcessorContext,
) => void;

// Handles a message from the main thread. Runs ON THE AUDIO THREAD, so it must
// be cheap — put expensive work in `prepareMessage` instead.
export type ProcessorMessageHandler = (
  data: unknown,
  state: ProcessorState,
) => void;

export type ProcessorDefinition = {
  name: string;
  parameterDescriptors: ProcessorParamDescriptor[];
  // DSP for one block. Self-contained (its source is embedded into the worklet).
  process?: ProcessFunction;
  // Seeds per-instance state. Omit for stateless processors. Self-contained.
  createState?: () => ProcessorState;
  // Main -> processor messages. Audio thread; keep cheap. Self-contained.
  onMessage?: ProcessorMessageHandler;
  // Main-thread transform applied to a message BEFORE it reaches the processor.
  // Expensive precomputation belongs here (e.g. rendering wavetable frames) so
  // the audio thread never misses its deadline. An ordinary function: it runs on
  // the main thread, so it has no self-containment restrictions.
  prepareMessage?: (data: unknown) => unknown;
};
