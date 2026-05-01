// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterErrorComponent } from "../../src/components/RouterErrorComponent";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useRouter: () => ({
    navigate: navigateMock,
  }),
}));

describe("RouterErrorComponent", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders outside Redux provider because root route errors bypass route providers", () => {
    expect(() => {
      render(
        <RouterErrorComponent
          error={new Error("route failed")}
          reset={vi.fn()}
        />,
      );
    }).not.toThrow();
  });
});
