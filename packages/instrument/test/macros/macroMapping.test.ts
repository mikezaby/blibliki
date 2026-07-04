import { describe, expect, it } from "vitest";
import {
  calculateMacroMappingValue,
  reduceMacroValue,
} from "@/macros/macroMapping";
import type { MacroMapping } from "@/macros/types";

const propSchema = {
  min: 200,
  max: 8200,
  exp: 2,
};

describe("macro mapping", () => {
  it("maps a normalized macro value into the target range", () => {
    expect(
      calculateMacroMappingValue(0.5, { moduleId: "filter", propKey: "cutoff" }, {
        min: 0,
        max: 100,
      }),
    ).toBe(50);
  });

  it("uses mapping min and max overrides before schema values", () => {
    expect(
      calculateMacroMappingValue(
        0.25,
        {
          moduleId: "filter",
          propKey: "cutoff",
          min: 1000,
          max: 5000,
          exp: 0,
        },
        propSchema,
      ),
    ).toBe(2000);
  });

  it("reverses the normalized value when inverted", () => {
    expect(
      calculateMacroMappingValue(
        0.25,
        {
          moduleId: "filter",
          propKey: "cutoff",
          min: 0,
          max: 100,
          exp: 0,
          inverted: true,
        },
        propSchema,
      ),
    ).toBe(75);
  });

  it("uses schema exp when mapping exp is omitted", () => {
    expect(
      calculateMacroMappingValue(
        0.5,
        { moduleId: "filter", propKey: "cutoff" },
        propSchema,
      ),
    ).toBe(2200);
  });

  it("allows exp zero to explicitly force linear mapping", () => {
    expect(
      calculateMacroMappingValue(
        0.5,
        { moduleId: "filter", propKey: "cutoff", exp: 0 },
        propSchema,
      ),
    ).toBe(4200);
  });

  it("rejects mapping ranges where max is not greater than min", () => {
    const mapping: MacroMapping = {
      moduleId: "filter",
      propKey: "cutoff",
      min: 10,
      max: 10,
    };

    expect(() => calculateMacroMappingValue(0.5, mapping, propSchema)).toThrow(
      "Macro mapping max must be greater than min",
    );
  });

  it("reduces relative encoder values and clamps macro value to 0..1", () => {
    expect(reduceMacroValue(0.5, 65)).toBeCloseTo(0.51);
    expect(reduceMacroValue(0.5, 63)).toBeCloseTo(0.49);
    expect(reduceMacroValue(0.995, 65)).toBe(1);
    expect(reduceMacroValue(0.005, 63)).toBe(0);
  });
});
