import { assertNever, Context } from "@blibliki/utils";
import { customEnvelopeProcessorURL } from "./custom-envelope-processor";
import { filterProcessorURL } from "./filter-processor";
import { lfoProcessorURL } from "./lfo-processor";
import { scaleProcessorURL } from "./scale-processor";
import { wavetableProcessorURL } from "./wavetable-processor";

export enum CustomWorklet {
  ScaleProcessor = "ScaleProcessor",
  FilterProcessor = "FilterProcessor",
  LFOProcessor = "LFOProcessor",
  CustomEnvelopeProcessor = "CustomEnvelopeProcessor",
  WavetableProcessor = "WavetableProcessor",
}

export async function loadProcessors(context: Context) {
  await context.addModule(scaleProcessorURL);
  await context.addModule(filterProcessorURL);
  await context.addModule(lfoProcessorURL);
  await context.addModule(customEnvelopeProcessorURL);
  await context.addModule(wavetableProcessorURL);
}

export function newAudioWorklet(context: Context, worklet: CustomWorklet) {
  switch (worklet) {
    case CustomWorklet.ScaleProcessor:
      return context.newAudioWorklet("scale-processor");
    case CustomWorklet.FilterProcessor:
      return context.newAudioWorklet("filter-processor");
    case CustomWorklet.LFOProcessor:
      return context.newAudioWorklet("lfo-processor");
    case CustomWorklet.CustomEnvelopeProcessor:
      return context.newAudioWorklet("custom-envelope-processor");
    case CustomWorklet.WavetableProcessor:
      return context.newAudioWorklet("wavetable-processor");
    default:
      assertNever(worklet);
  }
}
