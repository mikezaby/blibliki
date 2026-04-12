// @vitest-environment jsdom
import { Encoder } from "@blibliki/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Encoder", () => {
  it("reaches the full range in one moderate upward drag", () => {
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

    Object.assign(encoder, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn().mockReturnValue(true),
      releasePointerCapture: vi.fn(),
    });

    fireEvent.pointerDown(encoder, { pointerId: 1, clientY: 220 });
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 60 });

    expect(encoder.getAttribute("aria-valuenow")).toBe("1");
  });
});
