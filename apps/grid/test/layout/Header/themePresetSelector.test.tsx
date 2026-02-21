// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ThemePresetSelector from "../../../src/components/layout/Header/ThemePresetSelector";
import {
  THEME_PRESET_ROOT_ATTRIBUTE,
  THEME_PRESET_STORAGE_KEY,
} from "../../../src/hooks/useThemePreset";

describe("ThemePresetSelector", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_PRESET_ROOT_ATTRIBUTE);
  });

  it("renders stored preset as selected", () => {
    localStorage.setItem(THEME_PRESET_STORAGE_KEY, "nord");

    render(<ThemePresetSelector />);

    expect(
      screen.getByRole("button", { name: /theme preset/i }).textContent,
    ).toContain("Nord");
  });

  it("updates preset when selecting an option", () => {
    render(<ThemePresetSelector />);

    const trigger = screen.getByRole("button", { name: /theme preset/i });

    fireEvent.pointerDown(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /solarized/i }));

    expect(localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe("solarized");
    expect(
      document.documentElement.getAttribute(THEME_PRESET_ROOT_ATTRIBUTE),
    ).toBe("solarized");
  });

  it("shows and applies monochrome preset", () => {
    render(<ThemePresetSelector />);

    const trigger = screen.getByRole("button", { name: /theme preset/i });

    fireEvent.pointerDown(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: /monochrome/i }));

    expect(localStorage.getItem(THEME_PRESET_STORAGE_KEY)).toBe("mono");
    expect(
      document.documentElement.getAttribute(THEME_PRESET_ROOT_ATTRIBUTE),
    ).toBe("mono");
  });
});
