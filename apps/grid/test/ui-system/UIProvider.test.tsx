// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("UIProvider", () => {
  it("renders child content", () => {
    render(
      <UIProvider>
        <div data-testid="child">hello</div>
      </UIProvider>,
    );

    expect(screen.getByTestId("child").textContent).toBe("hello");
  });
});
