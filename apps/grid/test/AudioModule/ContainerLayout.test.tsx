// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Container from "../../src/components/AudioModule/Container";
import { UIProvider } from "../../src/ui-system/UIProvider";

describe("AudioModule Container layout", () => {
  it("does not hardcode tailwind utility classes by default", () => {
    const { container } = render(
      <UIProvider>
        <Container>
          <div>child</div>
        </Container>
      </UIProvider>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.className).not.toContain("justify-around");
    expect(root?.className).not.toContain("gap-x-8");
  });
});
