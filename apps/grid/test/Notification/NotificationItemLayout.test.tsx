// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationItem from "../../src/components/Notification/NotificationItem";
import { UIProvider } from "../../src/ui-system/UIProvider";

vi.mock("../../src/hooks", () => ({
  useAppDispatch: () => vi.fn(),
}));

describe("NotificationItem layout", () => {
  it("does not use legacy tailwind utility class strings on the alert root", () => {
    render(
      <UIProvider>
        <NotificationItem
          notification={{
            id: "n-1",
            type: "success",
            title: "Saved",
            message: "Patch saved",
            duration: 5000,
          }}
        />
      </UIProvider>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.className).not.toContain("bg-green-50");
    expect(alert.className).not.toContain("dark:");
  });
});
