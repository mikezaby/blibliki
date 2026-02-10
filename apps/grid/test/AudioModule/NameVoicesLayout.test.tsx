// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Name from "../../src/components/AudioModule/attributes/Name";
import Voices from "../../src/components/AudioModule/attributes/Voices";
import { UIProvider } from "../../src/ui-system/UIProvider";

vi.mock("../../src/hooks", () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock("../../src/components/AudioModule/modulesSlice", () => ({
  updateModule: vi.fn(() => ({ type: "modules/update" })),
}));

describe("AudioModule name and voices layout", () => {
  it("does not use legacy tailwind utility classes in Name", () => {
    const { container } = render(
      <UIProvider>
        <Name id="module-id" moduleType={ModuleType.Oscillator} value="Osc A" />
      </UIProvider>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.className).not.toContain("bg-slate-50");
    expect(root?.className).not.toContain("dark:");
  });

  it("does not use legacy tailwind utility classes in Voices", () => {
    const { container } = render(
      <UIProvider>
        <Voices id="module-id" moduleType={ModuleType.Oscillator} value={8} />
      </UIProvider>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.className).not.toContain("bg-slate-50");
    expect(root?.className).not.toContain("dark:");
  });
});
