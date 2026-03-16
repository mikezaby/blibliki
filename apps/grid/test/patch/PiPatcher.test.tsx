// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import PiPatcher from "../../src/components/PiPatcher";

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
  PiPatch: class PiPatch {
    static find = vi.fn();
  },
}));

describe("PiPatcher", () => {
  it("renders a new document without select item value errors", async () => {
    render(<PiPatcher piPatchId="new" />);

    expect(await screen.findByText("Track Setup")).toBeTruthy();
    expect(screen.getByText("FX Slot 1")).toBeTruthy();
  });
});
