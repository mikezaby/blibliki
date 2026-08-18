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

// The processor load step is platform-specific: on the web it loads Blob-URL
// AudioWorklet modules via addModule; on React Native it registers worklet DSP
// functions. The platform entry point (index.browser / index.native) wires the
// right implementation via setProcessorsLoader before any Engine is initialized.
// Kept out of this neutral module so the native bundle never pulls in Blob code.
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
