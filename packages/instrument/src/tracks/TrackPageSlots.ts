import { createSlotRef, EMPTY_SLOT_REF, type PageSlotRef } from "@/pages/Page";
import type { Fixed8 } from "@/types";

export function createTrackSlot(
  blockKey: Parameters<typeof createSlotRef>[0],
  slotKey: string,
) {
  return createSlotRef(blockKey, slotKey);
}

export function createTrackSlots(
  blockKey: Parameters<typeof createSlotRef>[0],
  slotKeys: string[],
): Fixed8<PageSlotRef> {
  const slots: PageSlotRef[] = slotKeys.map((slotKey) =>
    createTrackSlot(blockKey, slotKey),
  );
  while (slots.length < 8) {
    slots.push(EMPTY_SLOT_REF);
  }

  return slots as Fixed8<PageSlotRef>;
}
