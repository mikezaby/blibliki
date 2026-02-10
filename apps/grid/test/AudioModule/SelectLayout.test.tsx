// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Select from "../../src/components/Select";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("shared Select component layout", () => {
  it("does not hardcode tailwind utility width classes on trigger", () => {
    render(
      <UIProvider>
        <Select value="alpha" options={["alpha", "beta"]} onChange={vi.fn()} />
      </UIProvider>,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger.className).not.toContain("w-[180px]");
  });
});
