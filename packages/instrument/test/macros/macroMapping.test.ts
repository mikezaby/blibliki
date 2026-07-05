import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import {
  applyMacroOffsetsToModules,
  macroOffset,
  macroOffsetDelta,
  reduceMacroValue,
  totalMacroOffset,
} from "@/macros/macroMapping";
import type { MacroEncoder, MacroMapping } from "@/macros/types";

const cutoffMapping: MacroMapping = {
  moduleId: "track-1.filter.main",
  propKey: "cutoff",
  min: 0,
  max: 5000,
  exp: 0,
};

describe("macroOffset", () => {
  it("is zero at rest so the base is untouched (no jump)", () => {
    expect(macroOffset(0, cutoffMapping, "unipolar")).toBe(0);
  });

  it("scales linearly towards max for a positive position", () => {
    expect(macroOffset(0.5, cutoffMapping, "unipolar")).toBe(2500);
    expect(macroOffset(1, cutoffMapping, "unipolar")).toBe(5000);
  });

  it("applies the curve exponent when provided", () => {
    // exp comes from the mapping first, else the schema fallback argument.
    expect(macroOffset(0.5, { ...cutoffMapping, exp: 2 }, "unipolar")).toBe(
      0.25 * 5000,
    );
    expect(
      macroOffset(0.5, { ...cutoffMapping, exp: undefined }, "unipolar", 2),
    ).toBe(0.25 * 5000);
  });

  it("swings both directions from centre when bipolar", () => {
    const bipolar: MacroMapping = { ...cutoffMapping, min: -3000, max: 5000 };
    expect(macroOffset(0, bipolar, "bipolar")).toBe(0);
    expect(macroOffset(1, bipolar, "bipolar")).toBe(5000);
    expect(macroOffset(-1, bipolar, "bipolar")).toBe(-3000);
    expect(macroOffset(-0.5, bipolar, "bipolar")).toBe(-1500);
  });

  it("negates the offset when inverted", () => {
    expect(
      macroOffset(1, { ...cutoffMapping, inverted: true }, "unipolar"),
    ).toBe(-5000);
  });
});

describe("macroOffsetDelta", () => {
  it("returns the change in offset between two positions", () => {
    expect(macroOffsetDelta(0.5, 0.51, cutoffMapping, "unipolar")).toBeCloseTo(
      50,
    );
  });
});

describe("reduceMacroValue", () => {
  it("clamps to 0..1 for unipolar macros", () => {
    expect(reduceMacroValue(0.5, 65, "unipolar")).toBeCloseTo(0.51);
    expect(reduceMacroValue(0.5, 63, "unipolar")).toBeCloseTo(0.49);
    expect(reduceMacroValue(0.995, 65, "unipolar")).toBe(1);
    expect(reduceMacroValue(0.005, 63, "unipolar")).toBe(0);
  });

  it("clamps to -1..1 for bipolar macros", () => {
    expect(reduceMacroValue(-0.995, 63, "bipolar")).toBe(-1);
    expect(reduceMacroValue(0, 63, "bipolar")).toBeCloseTo(-0.01);
  });
});

function macro(overrides: Partial<MacroEncoder>): MacroEncoder {
  return {
    id: "macro-1",
    name: "Macro 1",
    enabled: true,
    value: 0,
    polarity: "unipolar",
    mappings: [],
    ...overrides,
  };
}

describe("totalMacroOffset", () => {
  it("sums the current offset of enabled macros on a prop", () => {
    const macros = [
      macro({ value: 0.5, mappings: [cutoffMapping] }),
      macro({ id: "macro-2", value: 0.2, mappings: [cutoffMapping] }),
      macro({
        id: "macro-3",
        enabled: false,
        value: 1,
        mappings: [cutoffMapping],
      }),
    ];

    expect(
      totalMacroOffset(macros, "track-1.filter.main", "cutoff"),
    ).toBeCloseTo(2500 + 1000);
  });
});

describe("applyMacroOffsetsToModules", () => {
  it("layers the macro offset onto the clean base and clamps to schema", () => {
    const modules = [
      {
        id: "track-1.filter.main",
        moduleType: ModuleType.Filter,
        props: { cutoff: 13000 } as Record<string, unknown>,
      },
    ];

    applyMacroOffsetsToModules(modules, [
      macro({ value: 1, mappings: [{ ...cutoffMapping, exp: 0 }] }),
    ]);

    // base 13000 + full offset 5000 = 18000, within the 20..20000 range.
    expect(modules[0]!.props.cutoff).toBe(18000);
  });

  it("clamps the layered value to the prop schema ceiling", () => {
    const modules = [
      {
        id: "track-1.filter.main",
        moduleType: ModuleType.Filter,
        props: { cutoff: 18000 } as Record<string, unknown>,
      },
    ];

    applyMacroOffsetsToModules(modules, [
      macro({ value: 1, mappings: [{ ...cutoffMapping, exp: 0 }] }),
    ]);

    // base 18000 + 5000 = 23000, clamped down to the 20000 ceiling.
    expect(modules[0]!.props.cutoff).toBe(20000);
  });
});
