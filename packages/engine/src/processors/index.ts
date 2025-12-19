import { assertNever, Context } from "@blibliki/utils";
import { filterProcessorURL } from "./filter-processor";
import { lfoProcessorURL } from "./lfo-processor";
import { scaleProcessorURL } from "./scale-processor";

export enum CustomWorklet {
  ScaleProcessor = "ScaleProcessor",
  FilterProcessor = "FilterProcessor",
  LFOProcessor = "LFOProcessor",
}

export async function loadProcessors(context: Context) {
  await context.addModule(scaleProcessorURL);
  await context.addModule(filterProcessorURL);
  await context.addModule(lfoProcessorURL);
}

export function newAudioWorklet(context: Context, worklet: CustomWorklet) {
  switch (worklet) {
    case CustomWorklet.ScaleProcessor:
      return context.newAudioWorklet("scale-processor");
    case CustomWorklet.FilterProcessor:
      return context.newAudioWorklet("filter-processor");
    case CustomWorklet.LFOProcessor:
      return context.newAudioWorklet("lfo-processor");
    default:
      assertNever(worklet);
  }
}
