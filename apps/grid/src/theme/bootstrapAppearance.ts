import {
  applyColorSchemeToRoot,
  readStoredColorScheme,
} from "@/hooks/useColorScheme";
import {
  applyThemePresetToRoot,
  readStoredThemePreset,
} from "@/hooks/useThemePreset";

export function applyStoredAppearanceToRoot() {
  if (typeof window === "undefined") {
    return;
  }

  applyColorSchemeToRoot(readStoredColorScheme());
  applyThemePresetToRoot(readStoredThemePreset());
}
