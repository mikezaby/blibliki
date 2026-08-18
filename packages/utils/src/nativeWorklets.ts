// Registry for cross-platform worklet processors.
//
// On the web a processor is loaded from a Blob URL via `addModule()` and
// constructed by name; on React Native the DSP runs as a `react-native-worklets`
// function passed to `createWorkletProcessingNode`. This registry is the seam:
// the engine registers each processor's definition here, `loadProcessors.web`
// packages it into a Blob (embedding `create`'s source), and `Context` (native
// variant) builds a WorkletProcessingNode from it.
//
// A processor is authored ONCE as a `NativeWorkletDefinition`: a statically
// declared top-level `process` (+ optional createState / onMessage), each
// self-contained (no imports, no module-scope references) so its source can be
// embedded into the web AudioWorklet AND workletized by react-native-worklets.
//
// Kept platform-neutral (a plain Map, no react-native imports) so it can be
// exported from the shared entrypoint and referenced on any platform.

export type NativeWorkletParamDescriptor = {
  name: string;
  defaultValue: number;
  minValue?: number;
  maxValue?: number;
  automationRate?: "a-rate" | "k-rate";
};

// Per-instance mutable state for stateful processors (filter history, LFO phase,
// wavetable frames, …). An instance field on web; a captured object persisted on
// the worklet runtime on native. Seeded by the definition's createState().
// `unknown` values so state can hold non-numeric data (e.g. Float32Array[]);
// processors cast it to their own shape.
export type NativeWorkletState = Record<string, unknown>;

export type NativeWorkletContext = {
  sampleRate: number;
  currentFrame: number; // global sample counter
  // Send a message to the main thread. Web: MessagePort.postMessage. Native:
  // scheduled onto the JS thread via runOnJS. Used for worklet -> module feedback
  // (wavetable position report, recorder audio chunks).
  post: (message: unknown, transfer?: unknown[]) => void;
};

// Handles a message from the main thread (module -> worklet). A statically
// declared, self-contained top-level "worklet" fn that may mutate state. Web:
// invoked from MessagePort.onmessage. Native: drained (in FIFO order) from a
// synchronizable-backed queue each block.
export type NativeWorkletMessageHandler = (
  data: unknown,
  state: NativeWorkletState,
) => void;

// The UNIFIED per-block DSP (definition.process). Runs on the audio thread.
// `params` mirrors web's AudioParam map (each value a Float32Array: length 1 for
// k-rate / native, block-length for a-rate on web). `state` is mutated in place
// to persist across blocks.
export type NativeWorkletProcess = (
  inputs: Float32Array[],
  outputs: Float32Array[],
  framesToProcess: number,
  params: Record<string, Float32Array>,
  state: NativeWorkletState,
  ctx: NativeWorkletContext,
) => void;

export type NativeWorkletDefinition = {
  name: string;
  parameterDescriptors: NativeWorkletParamDescriptor[];
  // Unified DSP: a self-contained, STATICALLY-declared top-level "worklet"
  // function. Used by BOTH platforms with no duplication — web embeds its source
  // into the AudioWorklet Blob; native captures it directly (react-native-
  // worklets' babel plugin transforms it).
  process?: NativeWorkletProcess;
  // Seeds per-instance state for a stateful `process` (mutated in place across
  // blocks). Omit for stateless processors. MUST be self-contained (embedded on
  // web / run on JS then captured on native).
  createState?: () => NativeWorkletState;
  // Optional message handler for a unified `process` (module -> worklet), e.g.
  // wavetable table loads. Statically declared + self-contained like `process`.
  // RUNS ON THE AUDIO THREAD (web: port.onmessage on the render thread; native:
  // drained in the process callback) — it MUST be cheap. Put expensive work in
  // `prepareMessage` instead.
  onMessage?: NativeWorkletMessageHandler;
  // Optional main/JS-thread transform applied to a message BEFORE it is delivered
  // to the worklet (both platforms). This is where expensive precomputation
  // belongs — e.g. rendering wavetable Fourier tables to frames — so the audio
  // thread never misses its deadline. An ordinary function: it runs on the JS
  // thread, so it is NOT a worklet and has no self-containment restrictions.
  prepareMessage?: (data: unknown) => unknown;
};

const registry = new Map<string, NativeWorkletDefinition>();

export function registerNativeWorklet(
  definition: NativeWorkletDefinition,
): void {
  registry.set(definition.name, definition);
}

export function getNativeWorkletDefinition(
  name: string,
): NativeWorkletDefinition {
  const definition = registry.get(name);
  if (!definition) {
    throw new Error(`No native worklet registered for "${name}"`);
  }
  return definition;
}
