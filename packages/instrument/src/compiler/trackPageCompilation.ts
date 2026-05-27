import type BaseBlock from "@/blocks/BaseBlock";
import type { PageRegion, PageSlotRef, SlotRef } from "@/pages/Page";
import type BaseTrack from "@/tracks/BaseTrack";
import type { Fixed8 } from "@/types";
import type { CompiledPage, CompiledPageSlot } from "./types";

function resolveSlot(block: BaseBlock, slotRef: SlotRef): CompiledPageSlot {
  const slot = block.findSlot(slotRef.slotKey);

  return {
    kind: "slot",
    blockKey: block.key,
    blockType: block.type,
    slotKey: slot.key,
    label: slot.label,
    shortLabel: slot.shortLabel,
    valueSpec: slot.valueSpec,
    binding: slot.binding,
    initialValue: slot.initialValue,
    inactive: slot.inactive,
  };
}

function resolvePageSlot(
  track: BaseTrack,
  slotRef: PageSlotRef,
): CompiledPageSlot {
  if (slotRef.kind === "empty") {
    return {
      kind: "empty",
    };
  }

  const block = track.findBlock(slotRef.blockKey);
  return resolveSlot(block, slotRef);
}

function resolvePageRegion(track: BaseTrack, region: PageRegion) {
  return {
    position: region.position,
    slots: region.slots.map((slotRef) =>
      resolvePageSlot(track, slotRef),
    ) as Fixed8<CompiledPageSlot>,
  };
}

export function compileTrackPages(track: BaseTrack): CompiledPage[] {
  return Array.from(track.pages.values()).map((page) => ({
    key: page.key,
    kind: page.kind,
    regions: page.regions.map((region) =>
      resolvePageRegion(track, region),
    ) as CompiledPage["regions"],
  }));
}
