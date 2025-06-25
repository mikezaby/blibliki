import { useEffect, useState } from "react";

export enum ColorScheme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

const getSystemScheme = (): ColorScheme => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? ColorScheme.Dark
    : ColorScheme.Light;
};

const getInitialScheme = (): ColorScheme => {
  if (typeof window === "undefined") return ColorScheme.Light;

  const stored = localStorage.getItem("color-scheme") as ColorScheme | null;
  return stored ?? ColorScheme.System;
};

const setThemeToRootElement = (scheme: ColorScheme) => {
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
  const [scheme, setScheme] = useState<ColorScheme>(getInitialScheme);

  useEffect(() => {
    setThemeToRootElement(scheme);
    localStorage.setItem("color-scheme", scheme);
  }, [scheme]);

  useEffect(() => {
    if (scheme !== ColorScheme.System) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setThemeToRootElement(ColorScheme.System);
    };
    media.addEventListener("change", onChange);

    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [scheme]);

  return { colorScheme: scheme, setColorScheme: setScheme };
}
