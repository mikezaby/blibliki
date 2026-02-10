// @vitest-environment jsdom
import { BooleanProp, EnumProp, NumberProp } from "@blibliki/engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CheckboxField,
  InputField,
  SelectField,
} from "../../src/components/AudioModule/attributes/Field";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("AudioModule field layout", () => {
  it("does not use legacy tailwind utility classes in InputField", () => {
    const { container } = render(
      <UIProvider>
        <InputField
          name="frequency"
          value={220}
          schema={{ kind: "number", label: "Frequency" } as NumberProp}
          onChange={vi.fn()}
        />
      </UIProvider>,
    );

    const fieldRoot = container.firstElementChild as HTMLElement | null;
    expect(fieldRoot).not.toBeNull();
    expect(fieldRoot?.className).not.toContain("bg-slate-50");
    expect(fieldRoot?.className).not.toContain("dark:");
  });

  it("does not use legacy tailwind utility classes in SelectField", () => {
    const { container } = render(
      <UIProvider>
        <SelectField
          name="mode"
          value="linear"
          schema={
            {
              kind: "enum",
              label: "Mode",
              options: ["linear", "exponential"],
            } as EnumProp<string>
          }
          onChange={vi.fn()}
        />
      </UIProvider>,
    );

    const fieldRoot = container.firstElementChild as HTMLElement | null;
    expect(fieldRoot).not.toBeNull();
    expect(fieldRoot?.className).not.toContain("bg-slate-50");
    expect(fieldRoot?.className).not.toContain("dark:");
  });

  it("does not use legacy tailwind utility classes in CheckboxField", () => {
    render(
      <UIProvider>
        <CheckboxField
          name="enabled"
          value={false}
          schema={{ kind: "boolean", label: "Enabled" } as BooleanProp}
          onChange={vi.fn()}
        />
      </UIProvider>,
    );

    const switchControl = screen.getByRole("switch");
    expect(switchControl.className).not.toContain("bg-green-500");
    expect(switchControl.className).not.toContain("dark:");
  });
});
