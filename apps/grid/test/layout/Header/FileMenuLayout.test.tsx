// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import FileMenu from "../../../src/components/layout/Header/FileMenu";
import { store } from "../../../src/store";
import { UIProvider } from "../../../src/ui-system/UIProvider";

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: null,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useUpload", () => ({
  default: () => ({
    open: vi.fn(),
  }),
}));

vi.mock("../../../src/components/Modal", () => ({
  TriggerModal: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("../../../src/components/layout/Header/FileMenu/ExportGrid", () => ({
  default: () => <span>Export Grid</span>,
}));

vi.mock("../../../src/components/layout/Header/FileMenu/ExportEngine", () => ({
  default: () => <span>Export Engine</span>,
}));

describe("FileMenu layout", () => {
  it("does not use legacy tailwind utility classes on the trigger button", () => {
    render(
      <Provider store={store}>
        <UIProvider>
          <FileMenu />
        </UIProvider>
      </Provider>,
    );

    const button = screen.getByRole("button", { name: "File" });
    expect(button.className).not.toContain("text-slate");
    expect(button.className).not.toContain("dark:");
  });
});
