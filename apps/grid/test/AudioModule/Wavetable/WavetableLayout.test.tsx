// @vitest-environment jsdom
import { ModuleType } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Wavetable from "../../../src/components/AudioModule/Wavetable";
import { UIProvider } from "../../../src/ui-system/UIProvider";

describe("Wavetable layout", () => {
  it("does not use legacy tailwind utility classes on wavetable actions", () => {
    render(
      <UIProvider>
        <Wavetable
          id="wavetable-id"
          name="Wavetable"
          moduleType={ModuleType.Wavetable}
          props={{
            tables: [{ real: [0, 0], imag: [0, 0] }],
            position: 0,
            frequency: 440,
            fine: 0,
            coarse: 0,
            octave: 0,
            lowGain: false,
            disableNormalization: false,
          }}
          updateProp={() => vi.fn()}
        />
      </UIProvider>,
    );

    const editButton = screen.getByRole("button", {
      name: "Edit Wavetable Config",
    });
    expect(editButton.className).not.toContain("bg-slate");
    expect(editButton.className).not.toContain("dark:");
  });
});
