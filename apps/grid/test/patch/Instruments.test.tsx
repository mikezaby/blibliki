// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Instruments from "../../src/components/Instruments";

const { instrumentAllMock } = vi.hoisted(() => ({
  instrumentAllMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@blibliki/models", () => ({
  Instrument: class Instrument {
    static all = instrumentAllMock;
  },
}));

describe("Instruments", () => {
  beforeEach(() => {
    instrumentAllMock.mockReset();
  });

  it("renders an empty state with a create button", async () => {
    instrumentAllMock.mockResolvedValue([]);

    render(<Instruments />);

    expect(await screen.findByText("No instruments yet")).toBeTruthy();
    expect(screen.getByText("Create Your First Instrument")).toBeTruthy();
  });

  it("renders existing instruments in the collection", async () => {
    const instrument = {
      id: "instrument-1",
      name: "Studio One",
      userId: "user-1",
      document: {
        templateId: "pi-8-track-v1",
        tracks: Array.from({ length: 8 }, () => ({})),
      },
    };

    instrumentAllMock.mockResolvedValue([
      {
        serialize: () => instrument,
      },
    ]);

    render(<Instruments />);

    expect(await screen.findByText("Studio One")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("pi-8-track-v1")).toBeTruthy();
  });
});
