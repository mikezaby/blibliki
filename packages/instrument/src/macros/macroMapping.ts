import { moduleSchemas, ModuleType, type NumberProp } from "@blibliki/engine";
import { getRelativeDelta } from "@/surfaces/launchControlXL3/LaunchControlXL3RelativeEncoder";
import type { MacroEncoder, MacroMapping, MacroPolarity } from "./types";

const MACRO_ENCODER_STEP = 0.01;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isNumberPropSchema(schema: unknown): schema is NumberProp {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "kind" in schema &&
    (schema as { kind?: unknown }).kind === "number"
  );
}

// Resolves the engine prop schema (min/max/exp) for a macro target. Shared by
// the live surface, save and load paths so they agree on clamp bounds and curve.
export function getMacroNumberSchema(
  moduleType: ModuleType,
  propKey: string,
): NumberProp | undefined {
  const schema = moduleSchemas[moduleType] as Record<string, unknown>;
  const propSchema = schema[propKey];

  return isNumberPropSchema(propSchema) ? propSchema : undefined;
}

// Advances the macro's stored position from a relative encoder tick. Unipolar
// macros rest at 0 (offset applied one way); bipolar macros rest at the centre
// 0 and swing to -1/+1 so a single knob can push a target both up and down.
export function reduceMacroValue(
  currentValue: number,
  ccValue: number,
  polarity: MacroPolarity,
) {
  const nextValue =
    currentValue + getRelativeDelta(ccValue) * MACRO_ENCODER_STEP;
  const min = polarity === "bipolar" ? -1 : 0;

  return clamp(nextValue, min, 1);
}

// The signed offset a macro adds on top of the target's base (its dedicated
// encoder value). `min`/`max` are offset endpoints, not absolute values: at
// rest (value 0) the offset is 0, so the base is untouched and there is no
// jump. Positive positions scale towards `max`, negative towards `min`.
export function macroOffset(
  value: number,
  mapping: MacroMapping,
  polarity: MacroPolarity,
  exp?: number,
): number {
  const minOffset = mapping.min ?? 0;
  const maxOffset = mapping.max ?? 0;
  const curveExp = mapping.exp ?? exp ?? 0;

  const clamped =
    polarity === "bipolar" ? clamp(value, -1, 1) : clamp(value, 0, 1);
  const magnitude = Math.abs(clamped);
  const curved = curveExp === 0 ? magnitude : Math.pow(magnitude, curveExp);
  const endpoint = clamped >= 0 ? maxOffset : minOffset;
  const raw = curved * endpoint;

  return mapping.inverted ? -raw : raw;
}

// How much to nudge the engine prop when the macro moves from one position to
// another. Applying the delta (rather than an absolute value) keeps the base
// intact even when the dedicated encoder has moved it in the meantime.
export function macroOffsetDelta(
  oldValue: number,
  newValue: number,
  mapping: MacroMapping,
  polarity: MacroPolarity,
  exp?: number,
): number {
  return (
    macroOffset(newValue, mapping, polarity, exp) -
    macroOffset(oldValue, mapping, polarity, exp)
  );
}

// Sum of every enabled macro's current offset on a given target prop. Used at
// save time to recover the clean base (engine value minus macro contribution).
export function totalMacroOffset(
  macros: MacroEncoder[],
  moduleId: string,
  propKey: string,
  exp?: number,
): number {
  let total = 0;

  for (const macro of macros) {
    if (!macro.enabled) {
      continue;
    }

    for (const mapping of macro.mappings) {
      if (mapping.moduleId === moduleId && mapping.propKey === propKey) {
        total += macroOffset(macro.value, mapping, macro.polarity, exp);
      }
    }
  }

  return total;
}

type MacroTargetModule = {
  id: string;
  moduleType: ModuleType;
  props: Record<string, unknown>;
};

// At load, the engine modules carry the clean base. Re-apply each enabled
// macro's offset so a patch saved with a macro turned away from rest sounds
// right immediately, before the encoder is next touched.
export function applyMacroOffsetsToModules(
  modules: MacroTargetModule[],
  macros: MacroEncoder[],
): void {
  for (const macro of macros) {
    if (!macro.enabled) {
      continue;
    }

    for (const mapping of macro.mappings) {
      const module = modules.find(
        (candidate) => candidate.id === mapping.moduleId,
      );
      if (!module) {
        continue;
      }

      const base = module.props[mapping.propKey];
      if (typeof base !== "number") {
        continue;
      }

      const schema = getMacroNumberSchema(module.moduleType, mapping.propKey);
      if (!schema) {
        continue;
      }

      const offset = macroOffset(
        macro.value,
        mapping,
        macro.polarity,
        schema.exp,
      );
      module.props = {
        ...module.props,
        [mapping.propKey]: clamp(base + offset, schema.min, schema.max),
      };
    }
  }
}
