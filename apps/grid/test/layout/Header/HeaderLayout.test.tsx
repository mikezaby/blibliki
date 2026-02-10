// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import Header from "../../../src/components/layout/Header";
import { store } from "../../../src/store";
import { UIProvider } from "../../../src/ui-system/UIProvider";

vi.mock("@clerk/clerk-react", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useClerk: () => ({ openSignIn: vi.fn() }),
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../../../src/components/layout/Header/FileMenu", () => ({
  default: () => <div data-testid="file-menu" />,
}));

vi.mock("../../../src/components/layout/Header/ColorSchemeToggle", () => ({
  default: () => <div data-testid="color-scheme-toggle" />,
}));

vi.mock("../../../src/components/layout/Header/FileMenu/LoadModal", () => ({
  default: () => <div data-testid="load-modal" />,
}));

describe("Header layout", () => {
  it("does not use legacy tailwind utility classes on the root header", () => {
    const { container } = render(
      <Provider store={store}>
        <UIProvider>
          <Header />
        </UIProvider>
      </Provider>,
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.className).not.toContain("bg-gradient-to-r");
    expect(header?.className).not.toContain("dark:");
  });
});
