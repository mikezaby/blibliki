import { assertNever, Context } from "@blibliki/utils";
import { filterProcessorURL } from "./filter-processor";
import { scaleProcessorURL } from "./scale-processor";

export enum CustomWorklet {
  ScaleProcessor = "ScaleProcessor",
  FilterProcessor = "FilterProcessor",
}

export async function loadProcessors(context: Context) {
  await context.addModule(scaleProcessorURL);
  await context.addModule(filterProcessorURL);
}

export function newAudioWorklet(context: Context, worklet: CustomWorklet) {
  switch (worklet) {
    case CustomWorklet.ScaleProcessor:
      return context.newAudioWorklet("scale-processor");
    case CustomWorklet.FilterProcessor:
      return context.newAudioWorklet("filter-processor");
    default:
      assertNever(worklet);
  }
}
