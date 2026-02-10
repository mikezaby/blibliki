// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AudioModules from "../../src/components/Grid/AudioModules";
import { UIProvider } from "../../src/ui-system/UIProvider";

vi.mock("../../src/components/Grid/useDrag", () => ({
  default: () => ({
    onDragStart: vi.fn(),
  }),
}));

describe("AudioModules layout", () => {
  it("does not use legacy tailwind utility classes on the panel root", () => {
    const { container } = render(
      <UIProvider>
        <AudioModules />
      </UIProvider>,
    );

    const panelRoot = container.firstElementChild as HTMLElement | null;
    expect(panelRoot).not.toBeNull();
    expect(panelRoot?.className).not.toContain("bg-slate-50");
    expect(panelRoot?.className).not.toContain("dark:");
  });
});
