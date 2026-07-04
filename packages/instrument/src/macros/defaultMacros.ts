import type { MacroControllerScope, MacroEncoder } from "./types";

export const GLOBAL_MACRO_SLOT_IDS = [
  "global-encoder-3",
  "global-encoder-4",
  "global-encoder-5",
  "global-encoder-6",
] as const;

export const DEFAULT_GLOBAL_MACRO_IDS = [
  "global-macro-1",
  "global-macro-2",
  "global-macro-3",
  "global-macro-4",
] as const;

function createDefaultMacro(index: number): MacroEncoder {
  return {
    id: DEFAULT_GLOBAL_MACRO_IDS[index]!,
    name: `Macro ${index + 1}`,
    enabled: false,
    value: 0,
    polarity: "unipolar",
    mappings: [],
  };
}

export function createDefaultGlobalController(): MacroControllerScope {
  return {
    macros: DEFAULT_GLOBAL_MACRO_IDS.map((_, index) =>
      createDefaultMacro(index),
    ),
    encoderSlots: Object.fromEntries(
      GLOBAL_MACRO_SLOT_IDS.map((slotId, index) => [
        slotId,
        {
          type: "macro",
          macroId: DEFAULT_GLOBAL_MACRO_IDS[index]!,
        },
      ]),
    ),
  };
}
