import { describe, expect, it } from "vitest";
import {
  clonePresetTables,
  getPresetIdByTables,
  WAVETABLE_PRESETS,
} from "../../../src/components/AudioModule/Wavetable/presets";
import {
  buildPreviewWaveforms,
  getInterpolationState,
} from "../../../src/components/AudioModule/Wavetable/preview";

describe("wavetable presets", () => {
  it("provides a preset catalog with extended experimental choices", () => {
    expect(WAVETABLE_PRESETS.length).toBeGreaterThanOrEqual(13);
  });

  it("includes radical experimental presets", () => {
    const ids = WAVETABLE_PRESETS.map((preset) => preset.id);

    expect(ids).toContain("phase-shatter");
    expect(ids).toContain("comb-breaker");
    expect(ids).toContain("mirror-jumps");
  });

  it("stores valid table coefficients", () => {
    WAVETABLE_PRESETS.forEach((preset) => {
      expect(preset.tables.length).toBeGreaterThan(1);

      preset.tables.forEach((table) => {
        expect(table.real.length).toBeGreaterThanOrEqual(2);
        expect(table.imag.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  it("clones tables without mutating original preset", () => {
    const source = WAVETABLE_PRESETS[0]!;
    const clonedTables = clonePresetTables(source.tables);

    clonedTables[0]!.imag[1] = 999;

    expect(source.tables[0]!.imag[1]).not.toBe(999);
  });

  it("resolves preset id from matching table data", () => {
    const source = WAVETABLE_PRESETS[0]!;
    const clonedTables = clonePresetTables(source.tables);

    expect(getPresetIdByTables(clonedTables)).toBe(source.id);
  });

  it("returns undefined for non-preset table data", () => {
    const source = WAVETABLE_PRESETS[0]!;
    const mutated = clonePresetTables(source.tables);
    mutated[0]!.imag[1] = (mutated[0]!.imag[1] ?? 0) + 0.5;

    expect(getPresetIdByTables(mutated)).toBeUndefined();
  });

  it("has abrupt step-to-step deltas for the experimental set", () => {
    const experimentalIds = ["phase-shatter", "comb-breaker", "mirror-jumps"];

    experimentalIds.forEach((presetId) => {
      const preset = WAVETABLE_PRESETS.find(
        (candidate) => candidate.id === presetId,
      );
      expect(preset).toBeDefined();

      const deltas = preset!.tables.slice(1).map((table, index) => {
        const previous = preset!.tables[index]!;
        const size = Math.min(table.imag.length, previous.imag.length, 24);

        let total = 0;
        for (let harmonic = 1; harmonic < size; harmonic += 1) {
          total += Math.abs(
            (table.imag[harmonic] ?? 0) - (previous.imag[harmonic] ?? 0),
          );
        }

        return total / Math.max(1, size - 1);
      });

      const maxDelta = deltas.reduce((max, delta) => Math.max(max, delta), 0);
      expect(maxDelta).toBeGreaterThan(0.12);
    });
  });
});

describe("wavetable preview helpers", () => {
  it("maps interpolation state across boundaries", () => {
    expect(getInterpolationState(0, 4)).toEqual({
      fromIndex: 0,
      toIndex: 1,
      mix: 0,
    });
    expect(getInterpolationState(0.5, 3)).toEqual({
      fromIndex: 1,
      toIndex: 2,
      mix: 0,
    });
    expect(getInterpolationState(1, 4)).toEqual({
      fromIndex: 3,
      toIndex: 3,
      mix: 0,
    });
  });

  it("builds deterministic waveform point arrays", () => {
    const points = buildPreviewWaveforms(WAVETABLE_PRESETS[0]!.tables, 64);

    expect(points).toHaveLength(WAVETABLE_PRESETS[0]!.tables.length);
    points.forEach((tablePoints) => {
      expect(tablePoints).toHaveLength(64);
      tablePoints.forEach((value) => {
        expect(Number.isFinite(value)).toBe(true);
      });
    });
  });
});
