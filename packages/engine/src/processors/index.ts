import { assertNever } from "@blibliki/utils";
import { IAnyAudioContext } from "@/core";
import { filterProcessorURL } from "./filter-processor";
import { scaleProcessorURL } from "./scale-processor";

export enum CustomWorklet {
  ScaleProcessor = "ScaleProcessor",
  FilterProcessor = "FilterProcessor",
}

export async function loadProcessors(context: IAnyAudioContext) {
  await context.audioWorklet.addModule(scaleProcessorURL);
  await context.audioWorklet.addModule(filterProcessorURL);
}

export function newAudioWorklet(
  context: IAnyAudioContext,
  worklet: CustomWorklet,
) {
  switch (worklet) {
    case CustomWorklet.ScaleProcessor:
      return new AudioWorkletNode(context, "scale-processor");
    case CustomWorklet.FilterProcessor:
      return new AudioWorkletNode(context, "filter-processor");
    default:
      assertNever(worklet);
  }
}
