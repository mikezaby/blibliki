// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UIProvider } from "../../src/ui-system/UIProvider";
import { Button } from "../../src/ui-system/components";

describe("Button wrapper", () => {
  it("does not hardcode legacy tailwind utility strings", () => {
    render(
      <UIProvider>
        <Button>Play</Button>
      </UIProvider>,
    );

    const button = screen.getByRole("button", { name: "Play" });
    expect(button.className).not.toContain("inline-flex");
    expect(button.className).not.toContain("shadow-xs");
  });
});
