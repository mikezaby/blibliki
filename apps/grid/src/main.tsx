import { UIProvider, themeToCssVariables, type UIMode } from "@blibliki/ui";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  THEME_PRESET_ROOT_ATTRIBUTE,
  readThemePresetFromRoot,
} from "./hooks/useThemePreset";
import { getRouter } from "./router";
import "./styles/index.css";
import { themePresets, type GridThemePresetId } from "./theme/presets";

const router = getRouter();
const getModeFromDocument = (): UIMode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";
const getThemePresetFromDocument = (): GridThemePresetId =>
  readThemePresetFromRoot();

function GridUIProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<UIMode>(() => getModeFromDocument());
  const [themePreset, setThemePreset] = useState<GridThemePresetId>(() =>
    getThemePresetFromDocument(),
  );
  const selectedTheme = themePresets[themePreset];

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setMode(getModeFromDocument());
      setThemePreset(getThemePresetFromDocument());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", THEME_PRESET_ROOT_ATTRIBUTE],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Portaled UI (Dropdown/Dialog content) renders outside the provider subtree.
    // Apply variables at document root so all UI primitives share the same theme.
    const rootStyle = document.documentElement.style;
    const variables = themeToCssVariables(selectedTheme, mode);

    for (const [name, value] of Object.entries(variables)) {
      rootStyle.setProperty(name, value);
    }
  }, [mode, selectedTheme]);

  return (
    <UIProvider mode={mode} theme={selectedTheme}>
      {children}
    </UIProvider>
  );
}

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <GridUIProvider>
      <RouterProvider router={router} />
    </GridUIProvider>
  </StrictMode>,
);
