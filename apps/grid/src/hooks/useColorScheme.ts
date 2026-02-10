import {
  createElement,
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export enum ColorScheme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

export type ResolvedColorScheme = Exclude<ColorScheme, ColorScheme.System>;

type ColorSchemeContextValue = {
  colorScheme: ColorScheme;
  resolvedColorScheme: ResolvedColorScheme;
  setColorScheme: Dispatch<SetStateAction<ColorScheme>>;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

const getSystemScheme = (): ResolvedColorScheme => {
  if (typeof window === "undefined") return ColorScheme.Light;
  if (typeof window.matchMedia !== "function") return ColorScheme.Light;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? ColorScheme.Dark
    : ColorScheme.Light;
};

const getInitialScheme = (): ColorScheme => {
  if (typeof window === "undefined") return ColorScheme.Light;
  if (typeof localStorage === "undefined") return ColorScheme.System;

  const stored = localStorage.getItem("color-scheme") as ColorScheme | null;
  return stored ?? ColorScheme.System;
};

const getInitialResolvedScheme = (): ResolvedColorScheme => {
  if (typeof window === "undefined") return ColorScheme.Light;
  return getSystemScheme();
};

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getInitialScheme);
  const [systemScheme, setSystemScheme] = useState<ResolvedColorScheme>(
    getInitialResolvedScheme,
  );

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("color-scheme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemScheme(getSystemScheme());
    };
    media.addEventListener("change", onChange);

    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  const resolvedColorScheme =
    colorScheme === ColorScheme.System ? systemScheme : colorScheme;

  const value = useMemo<ColorSchemeContextValue>(
    () => ({
      colorScheme,
      resolvedColorScheme,
      setColorScheme,
    }),
    [colorScheme, resolvedColorScheme],
  );

  return createElement(ColorSchemeContext.Provider, { value }, children);
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error("useColorScheme must be used within ColorSchemeProvider");
  }
  return context;
}
