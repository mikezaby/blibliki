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

const brightnessStep = (token: string): number => {
  if (token === "var(--color-black)") return 1000;
  if (token === "var(--color-white)") return 0;

  const match = token.match(/-(\d+)\)$/);
  if (!match) return -1;
  return Number(match[1]);
};

const expectGradualStep = (
  from: number,
  to: number,
  bounds: { min?: number; max?: number } = {},
) => {
  const { min = 50, max = 150 } = bounds;
  const delta = Math.abs(from - to);
  expect(delta).toBeGreaterThanOrEqual(min);
  expect(delta).toBeLessThanOrEqual(max);
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

  it("keeps light-mode surface hierarchy consistent in every preset", () => {
    const presetIds = Object.keys(themePresets) as GridThemePresetId[];

    presetIds.forEach((presetId) => {
      const { light } = themePresets[presetId];

      const raisedStep = brightnessStep(light.surfaceRaised);
      const panelStep = brightnessStep(light.surface1);
      const canvasStep = brightnessStep(light.surface0);
      const subtleStep = brightnessStep(light.surface2);
      const borderStep = brightnessStep(light.borderSubtle);

      expect(raisedStep).toBeLessThan(panelStep);
      expect(panelStep).toBeLessThan(canvasStep);
      expect(canvasStep).toBeLessThan(subtleStep);
      expect(subtleStep).toBeLessThan(borderStep);

      expectGradualStep(raisedStep, panelStep);
      expectGradualStep(panelStep, canvasStep);
      expectGradualStep(canvasStep, subtleStep);
      expectGradualStep(subtleStep, borderStep);
    });
  });

  it("keeps dark-mode surface hierarchy consistent in every preset", () => {
    const presetIds = Object.keys(themePresets) as GridThemePresetId[];

    presetIds.forEach((presetId) => {
      const { dark } = themePresets[presetId];

      const canvasStep = brightnessStep(dark.surface0);
      const panelStep = brightnessStep(dark.surface1);
      const raisedStep = brightnessStep(dark.surfaceRaised);
      const subtleStep = brightnessStep(dark.surface2);
      const borderStep = brightnessStep(dark.borderSubtle);

      expect(canvasStep).toBeGreaterThan(panelStep);
      expect(panelStep).toBeGreaterThan(raisedStep);
      expect(raisedStep).toBeGreaterThan(subtleStep);
      expect(subtleStep).toBeGreaterThan(borderStep);

      expectGradualStep(canvasStep, panelStep);
      expectGradualStep(panelStep, raisedStep);
      expectGradualStep(raisedStep, subtleStep);
      expectGradualStep(subtleStep, borderStep);
    });
  });

  it("keeps text hierarchy gradual in all presets", () => {
    const presetIds = Object.keys(themePresets) as GridThemePresetId[];

    presetIds.forEach((presetId) => {
      const preset = themePresets[presetId];

      const lightPrimary = brightnessStep(preset.light.textPrimary);
      const lightSecondary = brightnessStep(preset.light.textSecondary);
      const lightMuted = brightnessStep(preset.light.textMuted);

      expect(lightPrimary).toBeGreaterThan(lightSecondary);
      expect(lightSecondary).toBeGreaterThan(lightMuted);
      expectGradualStep(lightPrimary, lightSecondary, { max: 250 });
      expectGradualStep(lightSecondary, lightMuted, { max: 250 });

      const darkPrimary = brightnessStep(preset.dark.textPrimary);
      const darkSecondary = brightnessStep(preset.dark.textSecondary);
      const darkMuted = brightnessStep(preset.dark.textMuted);

      expect(darkPrimary).toBeLessThan(darkSecondary);
      expect(darkSecondary).toBeLessThan(darkMuted);
      expectGradualStep(darkPrimary, darkSecondary, { max: 250 });
      expectGradualStep(darkSecondary, darkMuted, { max: 250 });
    });
  });

  it("keeps semantic tone 600 darker than 500 in all presets", () => {
    const presetIds = Object.keys(themePresets) as GridThemePresetId[];

    presetIds.forEach((presetId) => {
      const preset = themePresets[presetId];
      const tonePairs = [
        [preset.light.primary500, preset.light.primary600],
        [preset.light.secondary500, preset.light.secondary600],
        [preset.light.error500, preset.light.error600],
        [preset.light.warning500, preset.light.warning600],
        [preset.light.info500, preset.light.info600],
        [preset.light.success500, preset.light.success600],
        [preset.dark.primary500, preset.dark.primary600],
        [preset.dark.secondary500, preset.dark.secondary600],
        [preset.dark.error500, preset.dark.error600],
        [preset.dark.warning500, preset.dark.warning600],
        [preset.dark.info500, preset.dark.info600],
        [preset.dark.success500, preset.dark.success600],
      ];

      tonePairs.forEach(([tone500, tone600]) => {
        const step500 = brightnessStep(tone500);
        const step600 = brightnessStep(tone600);

        expect(step600).toBeGreaterThan(step500);
        expectGradualStep(step500, step600);
      });
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

  it("keeps monochrome success tone distinct from subtle surfaces", () => {
    const mono = themePresets.mono;

    const lightSuccessSurfaceDelta = Math.abs(
      brightnessStep(mono.light.success500) -
        brightnessStep(mono.light.surface2),
    );
    const darkSuccessSurfaceDelta = Math.abs(
      brightnessStep(mono.dark.success500) - brightnessStep(mono.dark.surface2),
    );

    expect(lightSuccessSurfaceDelta).toBeGreaterThanOrEqual(250);
    expect(darkSuccessSurfaceDelta).toBeGreaterThanOrEqual(250);
  });
});
