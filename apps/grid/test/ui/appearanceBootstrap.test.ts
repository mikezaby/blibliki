// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ColorScheme,
  COLOR_SCHEME_STORAGE_KEY,
} from "../../src/hooks/useColorScheme";
import {
  THEME_PRESET_ROOT_ATTRIBUTE,
  THEME_PRESET_STORAGE_KEY,
} from "../../src/hooks/useThemePreset";
import { applyStoredAppearanceToRoot } from "../../src/theme/bootstrapAppearance";

describe("appearance bootstrap", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute(THEME_PRESET_ROOT_ATTRIBUTE);

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("restores stored dark mode and theme preset to the root before app render", () => {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, ColorScheme.Dark);
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, "solarized");

    applyStoredAppearanceToRoot();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(
      document.documentElement.getAttribute(THEME_PRESET_ROOT_ATTRIBUTE),
    ).toBe("solarized");
  });

  it("clears stale dark mode when light mode is stored", () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, ColorScheme.Light);

    applyStoredAppearanceToRoot();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("resolves system mode from matchMedia during bootstrap", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, ColorScheme.System);

    applyStoredAppearanceToRoot();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
