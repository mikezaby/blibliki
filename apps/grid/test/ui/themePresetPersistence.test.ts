// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_GRID_THEME_PRESET,
  THEME_PRESET_ROOT_ATTRIBUTE,
  THEME_PRESET_STORAGE_KEY,
  useThemePreset,
} from "../../src/hooks/useThemePreset";

describe("theme preset persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_PRESET_ROOT_ATTRIBUTE);
  });

  it("uses slate as fallback when nothing is stored", () => {
    const { result } = renderHook(() => useThemePreset());

    expect(result.current.themePreset).toBe(DEFAULT_GRID_THEME_PRESET);
    expect(localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe(
      DEFAULT_GRID_THEME_PRESET,
    );
    expect(
      document.documentElement.getAttribute(THEME_PRESET_ROOT_ATTRIBUTE),
    ).toBe(DEFAULT_GRID_THEME_PRESET);
  });

  it("loads a valid stored preset", () => {
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, "nord");

    const { result } = renderHook(() => useThemePreset());

    expect(result.current.themePreset).toBe("nord");
  });

  it("prefers root preset attribute when present", () => {
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, "nord");
    document.documentElement.setAttribute(THEME_PRESET_ROOT_ATTRIBUTE, "one");

    const { result } = renderHook(() => useThemePreset());

    expect(result.current.themePreset).toBe("one");
  });

  it("falls back when stored preset is invalid", () => {
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, "invalid-theme");

    const { result } = renderHook(() => useThemePreset());

    expect(result.current.themePreset).toBe(DEFAULT_GRID_THEME_PRESET);
  });

  it("persists updates to localStorage and root attribute", () => {
    const { result } = renderHook(() => useThemePreset());

    act(() => {
      result.current.setThemePreset("solarized");
    });

    expect(result.current.themePreset).toBe("solarized");
    expect(localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe("solarized");
    expect(
      document.documentElement.getAttribute(THEME_PRESET_ROOT_ATTRIBUTE),
    ).toBe("solarized");
  });
});
