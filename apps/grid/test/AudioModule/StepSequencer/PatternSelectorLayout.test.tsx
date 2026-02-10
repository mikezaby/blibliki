// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PatternSelector from "../../../src/components/AudioModule/StepSequencer/PatternSelector";
import { UIProvider } from "../../../src/ui-system/UIProvider";

describe("StepSequencer pattern selector layout", () => {
  it("does not use legacy tailwind utility classes on pattern actions", () => {
    render(
      <UIProvider>
        <PatternSelector
          patterns={[{ name: "A", pages: [] }]}
          activePatternNo={0}
          onPatternChange={vi.fn()}
          onAddPattern={vi.fn()}
          onDeletePattern={vi.fn()}
          patternSequence="2A4B"
          enableSequence={false}
          updateProp={() => vi.fn()}
        />
      </UIProvider>,
    );

    const addButton = screen.getByRole("button", { name: "+ New" });
    expect(addButton.className).not.toContain("bg-green-500");
    expect(addButton.className).not.toContain("dark:");
  });
});
