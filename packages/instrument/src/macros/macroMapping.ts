import { getRelativeDelta } from "@/surfaces/launchControlXL3/LaunchControlXL3RelativeEncoder";
import type { MacroMapping } from "./types";

const MACRO_ENCODER_STEP = 0.01;

type NumericPropSchema = {
  min: number;
  max: number;
  exp?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function reduceMacroValue(currentValue: number, ccValue: number) {
  const nextValue =
    currentValue + getRelativeDelta(ccValue) * MACRO_ENCODER_STEP;

  return clamp(nextValue, 0, 1);
}

export function calculateMacroMappingValue(
  macroValue: number,
  mapping: MacroMapping,
  propSchema: NumericPropSchema,
) {
  const min = mapping.min ?? propSchema.min;
  const max = mapping.max ?? propSchema.max;

  if (max <= min) {
    throw new Error("Macro mapping max must be greater than min");
  }

  const exp = mapping.exp ?? propSchema.exp ?? 0;
  const normalized = mapping.inverted
    ? 1 - clamp(macroValue, 0, 1)
    : clamp(macroValue, 0, 1);
  const curved = exp === 0 ? normalized : Math.pow(normalized, exp);

  return min + curved * (max - min);
}
