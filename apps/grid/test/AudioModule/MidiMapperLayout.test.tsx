// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MidiMapper from "../../src/components/AudioModule/MidiMapper";
import { UIProvider } from "../../src/ui-system/UIProvider";

vi.mock("../../src/hooks", () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => [],
}));

describe("MidiMapper layout", () => {
  it("does not use legacy tailwind utility classes on add mapping button", () => {
    render(
      <UIProvider>
        <MidiMapper
          id="midi-mapper-id"
          name="Midi Mapper"
          moduleType={ModuleType.MidiMapper}
          props={{
            pages: [{ name: "Page 1", mappings: [{}] }],
            activePage: 0,
            globalMappings: [],
          }}
          updateProp={() => vi.fn()}
        />
      </UIProvider>,
    );

    const addButton = screen.getByRole("button", { name: "Add New Mapping" });
    expect(addButton.className).not.toContain("bg-slate-50");
    expect(addButton.className).not.toContain("dark:");
  });
});
