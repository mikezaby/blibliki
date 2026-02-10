// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import Devices from "../../src/components/Devices";
import { store } from "../../src/store";
import { UIProvider } from "../../src/ui-system/UIProvider";

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: null,
  }),
}));

vi.mock("../../src/components/Devices/DeviceModal", () => ({
  default: () => <div data-testid="device-modal" />,
}));

describe("Devices layout", () => {
  it("does not use legacy tailwind utility classes on the page root", () => {
    const { container } = render(
      <Provider store={store}>
        <UIProvider>
          <Devices />
        </UIProvider>
      </Provider>,
    );

    const pageRoot = container.firstElementChild as HTMLElement | null;
    expect(pageRoot).not.toBeNull();
    expect(pageRoot?.className).not.toContain("bg-slate-50");
    expect(pageRoot?.className).not.toContain("dark:");
  });
});
