// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Fader from "../../src/components/Fader";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("Fader layout", () => {
  it("does not use legacy tailwind utility classes in label row", () => {
    render(
      <UIProvider>
        <Fader name="Gain" value={0.5} onChange={() => {}} />
      </UIProvider>,
    );

    const label = screen.getByText("Gain");
    expect(label.className).not.toContain("text-slate");
    expect(label.className).not.toContain("dark:");
  });
});
