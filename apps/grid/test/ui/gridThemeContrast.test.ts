// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRID_THEME_PRESET,
  themePresets,
  type GridThemePresetId,
} from "../../src/theme/presets";
import { gridUITheme } from "../../src/theme/uiTheme";

const monochromeStep = (token: string): number => {
  if (token === "var(--color-black)") return 1000;
  if (token === "var(--color-white)") return 0;

  const match = token.match(/zinc-(\d+)/);
  if (!match) return -1;
  return Number(match[1]);
};

describe("grid UI theme contrast", () => {
  it("keeps slate as the default preset", () => {
    expect(DEFAULT_GRID_THEME_PRESET).toBe("slate");
    expect(gridUITheme).toBe(themePresets[DEFAULT_GRID_THEME_PRESET]);
  });

  it("keeps control borders distinct from subtle surfaces in every preset", () => {
    const presetIds = Object.keys(themePresets) as GridThemePresetId[];

    expect(presetIds).toEqual(["slate", "nord", "solarized", "one", "mono"]);

    presetIds.forEach((presetId) => {
      const preset = themePresets[presetId];

      expect(preset.light.borderSubtle).not.toBe(preset.light.surface2);
      expect(preset.dark.borderSubtle).not.toBe(preset.dark.surface2);
    });
  });

  it("keeps monochrome preset high-resolution while staying grayscale-only", () => {
    const mono = themePresets.mono;
    const lightValues = Object.values(mono.light);
    const darkValues = Object.values(mono.dark);
    const grayscaleTokenPattern =
      /^var\(--color-(?:zinc-(?:50|100|200|300|400|500|600|700|800|900|950)|black|white)\)$/;

    expect(new Set(lightValues).size).toBeGreaterThanOrEqual(13);
    expect(new Set(darkValues).size).toBeGreaterThanOrEqual(13);

    [...lightValues, ...darkValues].forEach((value) => {
      expect(value).toMatch(grayscaleTokenPattern);
    });
  });

  it("keeps monochrome audio and MIDI channels visually distinct", () => {
    const mono = themePresets.mono;

    expect(mono.light.primary500).not.toBe(mono.light.secondary500);
    expect(mono.light.primary600).not.toBe(mono.light.secondary600);

    expect(mono.dark.primary500).not.toBe(mono.dark.secondary500);
    expect(mono.dark.primary600).not.toBe(mono.dark.secondary600);
  });

  it("keeps mono audio and MIDI gradients equally visible", () => {
    const mono = themePresets.mono;

    const lightAudioDelta = Math.abs(
      monochromeStep(mono.light.primary500) -
        monochromeStep(mono.light.secondary500),
    );
    const darkAudioDelta = Math.abs(
      monochromeStep(mono.dark.primary500) -
        monochromeStep(mono.dark.secondary500),
    );

    expect(lightAudioDelta).toBeGreaterThanOrEqual(200);
    expect(darkAudioDelta).toBeGreaterThanOrEqual(200);
  });

  it("keeps mono primary and secondary channels strongly separated", () => {
    const mono = themePresets.mono;

    const lightPrimarySecondary500Delta = Math.abs(
      monochromeStep(mono.light.primary500) -
        monochromeStep(mono.light.secondary500),
    );
    const lightPrimarySecondary600Delta = Math.abs(
      monochromeStep(mono.light.primary600) -
        monochromeStep(mono.light.secondary600),
    );
    const darkPrimarySecondary500Delta = Math.abs(
      monochromeStep(mono.dark.primary500) -
        monochromeStep(mono.dark.secondary500),
    );
    const darkPrimarySecondary600Delta = Math.abs(
      monochromeStep(mono.dark.primary600) -
        monochromeStep(mono.dark.secondary600),
    );

    expect(lightPrimarySecondary500Delta).toBeGreaterThanOrEqual(350);
    expect(lightPrimarySecondary600Delta).toBeGreaterThanOrEqual(300);
    expect(darkPrimarySecondary500Delta).toBeGreaterThanOrEqual(300);
    expect(darkPrimarySecondary600Delta).toBeGreaterThanOrEqual(300);
  });
});
