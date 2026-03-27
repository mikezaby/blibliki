import type { BlockKey, Fixed2, Fixed8, TrackPageKey } from "@/types";

export type SlotRef = {
  kind: "slot";
  blockKey: BlockKey;
  slotKey: string;
};

export type EmptySlotRef = {
  kind: "empty";
};

export type PageSlotRef = SlotRef | EmptySlotRef;

export const EMPTY_SLOT_REF: EmptySlotRef = {
  kind: "empty",
};

const EMPTY_REGION_SLOTS: Fixed8<PageSlotRef> = [
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
] as const;

export type PageRegionPosition = "top" | "bottom";

export type PageRegion = {
  position: PageRegionPosition;
  slots: Fixed8<PageSlotRef>;
};

export type PageKind = "split";

export type Page = {
  key: TrackPageKey;
  kind: PageKind;
  regions: Fixed2<PageRegion>;
};

export function createSlotRef(blockKey: BlockKey, slotKey: string): SlotRef {
  return {
    kind: "slot",
    blockKey,
    slotKey,
  };
}

export function createPageRegion(
  position: PageRegionPosition,
  slots: Fixed8<PageSlotRef>,
): PageRegion {
  return {
    position,
    slots,
  };
}

export function createEmptyPageRegion(
  position: PageRegionPosition,
): PageRegion {
  return createPageRegion(position, [
    ...EMPTY_REGION_SLOTS,
  ] as Fixed8<PageSlotRef>);
}

export function createPage(
  key: TrackPageKey,
  top: Fixed8<PageSlotRef>,
  bottom: Fixed8<PageSlotRef>,
): Page {
  return {
    key,
    kind: "split",
    regions: [createPageRegion("top", top), createPageRegion("bottom", bottom)],
  };
}
