// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, Input, Label } from "../../src/components/ui";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("legacy ui wrappers", () => {
  it("does not hardcode tailwind utility classes in Input", () => {
    render(
      <UIProvider>
        <Input aria-label="Name" />
      </UIProvider>,
    );

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input.className).not.toContain("border-input");
    expect(input.className).not.toContain("focus-visible:");
  });

  it("does not hardcode tailwind utility classes in Card", () => {
    render(
      <UIProvider>
        <Card data-testid="card">
          <CardContent>Body</CardContent>
        </Card>
      </UIProvider>,
    );

    const card = screen.getByTestId("card");
    expect(card.className).not.toContain("rounded-xl");
    expect(card.className).not.toContain("shadow-sm");
  });

  it("does not hardcode tailwind utility classes in Label", () => {
    render(
      <UIProvider>
        <Label htmlFor="example">Example</Label>
      </UIProvider>,
    );

    const label = screen.getByText("Example");
    expect(label.className).not.toContain("text-sm");
    expect(label.className).not.toContain("font-medium");
  });
});
