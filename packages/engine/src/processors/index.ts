import { assertNever, Context } from "@blibliki/utils";
import { processorDefinitions } from "./definitions";

export enum CustomWorklet {
  ScaleProcessor = "ScaleProcessor",
  FilterProcessor = "FilterProcessor",
  LFOProcessor = "LFOProcessor",
  CustomEnvelopeProcessor = "CustomEnvelopeProcessor",
  WavetableProcessor = "WavetableProcessor",
  RecorderProcessor = "RecorderProcessor",
}

// The load step is injected rather than imported, so this module stays free of
// any platform-specific code: index.browser wires the Blob-URL AudioWorklet
// loader via setProcessorsLoader before any Engine is initialized, and another
// host could supply a different one.
type ProcessorsLoader = (context: Context) => Promise<void>;

let loader: ProcessorsLoader | null = null;

export function setProcessorsLoader(fn: ProcessorsLoader): void {
  loader = fn;
}

export async function loadProcessors(context: Context): Promise<void> {
  if (!loader) {
    throw new Error(
      "Processors loader not set — import @blibliki/engine via its package " +
        "entry (not an internal module) so the platform loader is wired.",
    );
  }
  await loader(context);
}

export function newAudioWorklet(context: Context, worklet: CustomWorklet) {
  return withPreparedMessages(
    context.newAudioWorklet(processorName(worklet)),
    processorName(worklet),
  );
}

function processorName(worklet: CustomWorklet): string {
  switch (worklet) {
    case CustomWorklet.ScaleProcessor:
      return "scale-processor";
    case CustomWorklet.FilterProcessor:
      return "filter-processor";
    case CustomWorklet.LFOProcessor:
      return "lfo-processor";
    case CustomWorklet.CustomEnvelopeProcessor:
      return "custom-envelope-processor";
    case CustomWorklet.WavetableProcessor:
      return "wavetable-processor";
    case CustomWorklet.RecorderProcessor:
      return "recorder-processor";
    default:
      assertNever(worklet);
  }
}

// Run the definition's `prepareMessage` on the JS/main thread before the message
// reaches the worklet, so expensive precomputation (e.g. rendering wavetable
// frames) never runs on the audio thread. Platform-neutral: wraps whichever port
// the context provided (real MessagePort on web, the shim on native).
function withPreparedMessages(
  node: AudioWorkletNode,
  name: string,
): AudioWorkletNode {
  const prepareMessage = processorDefinitions.find(
    (definition) => definition.name === name,
  )?.prepareMessage;
  if (!prepareMessage) return node;

  const port = node.port;
  const postMessage = port.postMessage.bind(port) as (
    message: unknown,
    transfer?: Transferable[],
  ) => void;
  port.postMessage = ((message: unknown, transfer?: Transferable[]) => {
    postMessage(prepareMessage(message), transfer);
  }) as typeof port.postMessage;

  return node;
}
