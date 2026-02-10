// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationContainer from "../../src/components/Notification/NotificationContainer";
import { UIProvider } from "../../src/ui-system/UIProvider";

vi.mock("../../src/hooks", () => ({
  useAppSelector: () => [
    {
      id: "n-1",
      type: "info",
      title: "Info",
      message: "hello",
      duration: 1000,
    },
  ],
}));

vi.mock("../../src/components/Notification/NotificationItem", () => ({
  default: () => <div data-testid="notification-item" />,
}));

describe("NotificationContainer layout", () => {
  it("does not use legacy tailwind utility classes on the container", () => {
    const { container } = render(
      <UIProvider>
        <NotificationContainer />
      </UIProvider>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.className).not.toContain("top-[54px]");
    expect(root?.className).not.toContain("pointer-events-none");
  });
});
