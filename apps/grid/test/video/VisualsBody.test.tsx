// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VisualsBody from "../../src/components/VideoModule/VisualsBody";

const { host } = vi.hoisted(() => ({
  host: { attachView: vi.fn(), detachView: vi.fn(), open: vi.fn(() => true) },
}));

vi.mock("../../src/video/videoHost", () => ({
  ensureVideoHost: () => host,
}));

describe("VisualsBody", () => {
  afterEach(cleanup);

  it("attaches a preview view on mount and detaches on unmount", () => {
    const { unmount } = render(<VisualsBody id="out" />);

    expect(host.attachView).toHaveBeenCalledWith(
      "out",
      expect.any(HTMLCanvasElement),
      15,
    );

    unmount();

    expect(host.detachView).toHaveBeenCalledWith("out");
  });

  it("opens the projector from its button", () => {
    render(<VisualsBody id="out" />);

    fireEvent.click(screen.getByRole("button", { name: /open projector/i }));

    expect(host.open).toHaveBeenCalled();
  });
});
