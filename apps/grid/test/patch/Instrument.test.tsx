// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import InstrumentEditor from "../../src/components/Instrument";

const navigateMock = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => navigateMock,
}));

vi.mock("@blibliki/models", () => ({
  Instrument: class Instrument {
    static find = vi.fn();
  },
}));

describe("InstrumentEditor", () => {
  it("renders a new document with track voices and matching sequencer notes", async () => {
    render(<InstrumentEditor instrumentId="new" />);

    expect(await screen.findByText("Track Setup")).toBeTruthy();
    expect((screen.getByLabelText("Voices") as HTMLInputElement).value).toBe(
      "1",
    );
    expect(screen.getByText("FX Slot 1")).toBeTruthy();
    expect(screen.getByText("Voice 1")).toBeTruthy();
    expect(screen.queryByText("Voice 2")).toBeNull();
  });

  it("shows the sequencer loop length control", async () => {
    render(<InstrumentEditor instrumentId="new" />);

    expect((await screen.findAllByText("Loop Length")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("1-1").length).toBeGreaterThan(0);
  });
});
