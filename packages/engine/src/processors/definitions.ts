import type { ProcessorDefinition } from "@blibliki/utils";
import customEnvelopeProcessor from "./custom-envelope.processor";
import filterProcessor from "./filter.processor";
import lfoProcessor from "./lfo.processor";
import recorderProcessor from "./recorder.processor";
import scaleProcessor from "./scale.processor";
import wavetableProcessor from "./wavetable.processor";

// Cross-platform processor definitions (authored once, packaged per-platform by
// the loaders): web builds each into a Blob, native registers each as a worklet.
export const processorDefinitions: ProcessorDefinition[] = [
  scaleProcessor,
  filterProcessor,
  lfoProcessor,
  customEnvelopeProcessor,
  recorderProcessor,
  wavetableProcessor,
];
