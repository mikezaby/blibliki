// @vitest-environment jsdom
import { Encoder } from "@blibliki/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Encoder", () => {
  afterEach(cleanup);

  const preparePointerCapture = (encoder: HTMLElement) => {
    Object.assign(encoder, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn().mockReturnValue(true),
      releasePointerCapture: vi.fn(),
    });
  };

  it("renders the value below the dial", () => {
    render(
      <Encoder
        name="Drive"
        min={0}
        max={1}
        step={0.01}
        value={0.42}
        onChange={vi.fn()}
      />,
    );

    const encoder = screen.getByRole("slider", { name: "Drive" });
    const dial = encoder.querySelector(".ui-encoder__dial");
    const value = screen.getByText("0.42");

    expect(dial?.contains(value)).toBe(false);
    expect(dial?.nextElementSibling).toBe(value);
  });

  it("reaches the full range in an 80px upward drag", () => {
    render(
      <Encoder
        name="Drive"
        min={0}
        max={1}
        step={0.01}
        defaultValue={0}
        onChange={vi.fn()}
      />,
    );

    const encoder = screen.getByRole("slider", { name: "Drive" });

    preparePointerCapture(encoder);

    fireEvent.pointerDown(encoder, { pointerId: 1, clientY: 180 });
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 100 });

    expect(encoder.getAttribute("aria-valuenow")).toBe("1");
  });

  it("uses eight times finer adjustment while Shift is held", () => {
    render(
      <Encoder
        name="Drive"
        min={0}
        max={1}
        step={0.01}
        defaultValue={0}
        onChange={vi.fn()}
      />,
    );

    const encoder = screen.getByRole("slider", { name: "Drive" });

    preparePointerCapture(encoder);

    fireEvent.pointerDown(encoder, { pointerId: 1, clientY: 180 });
    fireEvent.pointerMove(encoder, {
      pointerId: 1,
      clientY: 100,
      shiftKey: true,
    });

    expect(encoder.getAttribute("aria-valuenow")).toBe("0.13");
  });

  it("switches to fine adjustment during a drag without jumping", () => {
    render(
      <Encoder
        name="Drive"
        min={0}
        max={1}
        step={0.01}
        defaultValue={0}
        onChange={vi.fn()}
      />,
    );

    const encoder = screen.getByRole("slider", { name: "Drive" });

    preparePointerCapture(encoder);

    fireEvent.pointerDown(encoder, { pointerId: 1, clientY: 180 });
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 140 });
    fireEvent.pointerMove(encoder, {
      pointerId: 1,
      clientY: 132,
      shiftKey: true,
    });

    expect(encoder.getAttribute("aria-valuenow")).toBe("0.51");
  });
});
