import { useEffect, useState } from "react";
import {
  DEFAULT_GRID_THEME_PRESET,
  isGridThemePresetId,
  type GridThemePresetId,
} from "@/theme/presets";

export const THEME_PRESET_STORAGE_KEY = "grid-theme-preset";
export const THEME_PRESET_ROOT_ATTRIBUTE = "data-ui-theme-preset";
export { DEFAULT_GRID_THEME_PRESET };

export const readStoredThemePreset = (): GridThemePresetId => {
  if (typeof window === "undefined") return DEFAULT_GRID_THEME_PRESET;

  const stored = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
  return isGridThemePresetId(stored) ? stored : DEFAULT_GRID_THEME_PRESET;
};

export const readThemePresetFromRoot = (): GridThemePresetId => {
  if (typeof document === "undefined") return DEFAULT_GRID_THEME_PRESET;

  const value = document.documentElement.getAttribute(
    THEME_PRESET_ROOT_ATTRIBUTE,
  );
  return isGridThemePresetId(value) ? value : readStoredThemePreset();
};

export const applyThemePresetToRoot = (themePreset: GridThemePresetId) => {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute(
    THEME_PRESET_ROOT_ATTRIBUTE,
    themePreset,
  );
};

export function useThemePreset() {
  const [themePreset, setThemePreset] = useState<GridThemePresetId>(
    readThemePresetFromRoot,
  );

  useEffect(() => {
    applyThemePresetToRoot(themePreset);
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, themePreset);
  }, [themePreset]);

  return { themePreset, setThemePreset };
}
