// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ColorSchemeToggle from "../../../src/components/layout/Header/ColorSchemeToggle";
import { UIProvider } from "../../../src/ui-system/UIProvider";

vi.mock("@/hooks", () => ({
  ColorScheme: {
    Light: "light",
    Dark: "dark",
    System: "system",
  },
  useColorScheme: () => ({
    setColorScheme: vi.fn(),
  }),
}));

vi.mock("@/hooks/index", () => ({
  ColorScheme: {
    Light: "light",
    Dark: "dark",
    System: "system",
  },
  useColorScheme: () => ({
    setColorScheme: vi.fn(),
  }),
}));

describe("ColorSchemeToggle", () => {
  it("does not rely on legacy Tailwind utility class strings", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    render(
      <UIProvider>
        <ColorSchemeToggle />
      </UIProvider>,
    );

    const toggleButton = screen.getByRole("button", { name: "Toggle theme" });
    expect(toggleButton.className).not.toContain("text-slate");
    expect(toggleButton.className).not.toContain("dark:");
  });
});
