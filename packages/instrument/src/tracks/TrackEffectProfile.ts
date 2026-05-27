import ChorusBlock from "@/blocks/effects/ChorusBlock";
import DelayBlock from "@/blocks/effects/DelayBlock";
import DistortionBlock from "@/blocks/effects/DistortionBlock";
import ReverbBlock from "@/blocks/effects/ReverbBlock";
import type { EffectProfileId } from "@/document/types";
import { EMPTY_SLOT_REF, type PageSlotRef } from "@/pages/Page";
import { createTrackSlot } from "./TrackPageSlots";

export type TrackEffectBlockKey = "fx1" | "fx2" | "fx3" | "fx4";

export type TrackFxChain = [
  EffectProfileId,
  EffectProfileId,
  EffectProfileId,
  EffectProfileId,
];

export const DEFAULT_FX_CHAIN: TrackFxChain = [
  "distortion",
  "chorus",
  "delay",
  "reverb",
];

export function createEffectBlock(
  key: TrackEffectBlockKey,
  effectProfileId: EffectProfileId,
) {
  switch (effectProfileId) {
    case "distortion":
      return new DistortionBlock(key);
    case "chorus":
      return new ChorusBlock(key);
    case "delay":
      return new DelayBlock(key);
    case "reverb":
      return new ReverbBlock(key);
  }
}

export function createEffectPageSlots(
  blockKey: TrackEffectBlockKey,
  effectProfileId: EffectProfileId,
): PageSlotRef[] {
  switch (effectProfileId) {
    case "distortion":
      return [
        createTrackSlot(blockKey, "drive"),
        createTrackSlot(blockKey, "tone"),
        createTrackSlot(blockKey, "mix"),
        EMPTY_SLOT_REF,
      ];
    case "chorus":
      return [
        createTrackSlot(blockKey, "rate"),
        createTrackSlot(blockKey, "depth"),
        createTrackSlot(blockKey, "feedback"),
        createTrackSlot(blockKey, "mix"),
      ];
    case "delay":
      return [
        createTrackSlot(blockKey, "time"),
        createTrackSlot(blockKey, "feedback"),
        createTrackSlot(blockKey, "mix"),
        createTrackSlot(blockKey, "sync"),
      ];
    case "reverb":
      return [
        createTrackSlot(blockKey, "type"),
        createTrackSlot(blockKey, "decayTime"),
        createTrackSlot(blockKey, "preDelay"),
        createTrackSlot(blockKey, "mix"),
      ];
  }
}
