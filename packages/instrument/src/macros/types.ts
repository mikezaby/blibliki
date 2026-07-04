export type MacroPolarity = "unipolar" | "bipolar";

export type MacroMapping = {
  moduleId: string;
  propKey: string;
  min?: number;
  max?: number;
  exp?: number;
  inverted?: boolean;
};

export type MacroEncoder = {
  id: string;
  name: string;
  enabled: boolean;
  value: number;
  polarity: MacroPolarity;
  mappings: MacroMapping[];
};

export type EncoderSlotAssignment =
  | { type: "empty" }
  | { type: "globalControl"; key: string }
  | { type: "macro"; macroId: string };

export type MacroControllerScope = {
  macros: MacroEncoder[];
  encoderSlots: Record<string, EncoderSlotAssignment>;
};
