// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UIProvider } from "../../src/ui-system/UIProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../src/ui-system/components";

describe("Select wrapper", () => {
  it("does not hardcode tailwind utility classes in SelectTrigger", () => {
    render(
      <UIProvider>
        <Select value="alpha" onValueChange={() => {}}>
          <SelectTrigger aria-label="Patch preset">
            <SelectValue placeholder="Choose preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha">Alpha</SelectItem>
          </SelectContent>
        </Select>
      </UIProvider>,
    );

    const trigger = screen.getByRole("combobox", { name: "Patch preset" });
    expect(trigger.className).not.toContain("border-input");
    expect(trigger.className).not.toContain("focus-visible:");
  });
});
