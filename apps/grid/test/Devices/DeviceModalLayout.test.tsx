// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { store } from "../../src/store";
import { UIProvider } from "../../src/ui-system/UIProvider";

type ModalProps = {
  modalName: string;
  className?: string;
  children?: React.ReactNode;
};

const modalSpy = vi.fn();

vi.mock("@/components/Modal", () => ({
  close: () => ({ type: "modal/close" }),
  default: (props: ModalProps) => {
    modalSpy(props);
    return <div data-testid="modal-root">{props.children}</div>;
  },
}));

vi.mock("../../src/components/Modal", () => ({
  close: () => ({ type: "modal/close" }),
  default: (props: ModalProps) => {
    modalSpy(props);
    return <div data-testid="modal-root">{props.children}</div>;
  },
}));

describe("DeviceModal layout", () => {
  it("does not pass legacy Tailwind className to Modal", async () => {
    const { default: DeviceModal } =
      await import("../../src/components/Devices/DeviceModal");

    render(
      <Provider store={store}>
        <UIProvider>
          <DeviceModal deviceId="new" />
        </UIProvider>
      </Provider>,
    );

    expect(modalSpy).toHaveBeenCalled();
    const lastCall = modalSpy.mock.calls.at(-1)?.[0] as ModalProps | undefined;
    expect(lastCall).toBeDefined();
    expect(lastCall?.className ?? "").not.toContain("bg-white");
    expect(lastCall?.className ?? "").not.toContain("dark:");
  });
});
