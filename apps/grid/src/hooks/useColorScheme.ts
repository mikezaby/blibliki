import { useEffect, useState } from "react";

export enum ColorScheme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

export const COLOR_SCHEME_STORAGE_KEY = "color-scheme";

const getSystemScheme = (): ColorScheme => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? ColorScheme.Dark
    : ColorScheme.Light;
};

export const readStoredColorScheme = (): ColorScheme => {
  if (typeof window === "undefined") return ColorScheme.Light;

  const stored = localStorage.getItem(
    COLOR_SCHEME_STORAGE_KEY,
  ) as ColorScheme | null;
  return stored ?? ColorScheme.System;
};

export const applyColorSchemeToRoot = (scheme: ColorScheme) => {
  let applied: ColorScheme = scheme;

  if (scheme === ColorScheme.System) {
    applied = getSystemScheme();
  }

  const root = window.document.documentElement;
  if (applied === ColorScheme.Dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export function useColorScheme() {
  const [scheme, setScheme] = useState<ColorScheme>(readStoredColorScheme);

  useEffect(() => {
    applyColorSchemeToRoot(scheme);
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
  }, [scheme]);

  useEffect(() => {
    if (scheme !== ColorScheme.System) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyColorSchemeToRoot(ColorScheme.System);
    };
    media.addEventListener("change", onChange);

    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [scheme]);

  return { colorScheme: scheme, setColorScheme: setScheme };
}
