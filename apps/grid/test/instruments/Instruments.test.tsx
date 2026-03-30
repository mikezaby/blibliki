// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { store } from "../../src/store";

const {
  navigateMock,
  instrumentAllMock,
  instrumentDeleteMock,
  instrumentFindMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  instrumentAllMock: vi.fn(),
  instrumentDeleteMock: vi.fn(),
  instrumentFindMock: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (path, [key, value]) => path.replace(`$${key}`, value),
      to,
    );

    return <a href={href}>{children}</a>;
  },
  useNavigate: () => navigateMock,
}));

vi.mock("@blibliki/models", () => ({
  Instrument: class Instrument {
    id: string;
    name: string;
    userId: string;
    document: Record<string, unknown>;

    static all() {
      return instrumentAllMock();
    }

    static find(id: string) {
      return instrumentFindMock(id);
    }

    constructor({
      id = "",
      name,
      userId,
      document,
    }: {
      id?: string;
      name: string;
      userId: string;
      document: Record<string, unknown>;
    }) {
      this.id = id;
      this.name = name;
      this.userId = userId;
      this.document = document;
    }

    async save() {}

    async delete() {
      await instrumentDeleteMock();
    }

    serialize() {
      return {
        id: this.id,
        name: this.name,
        userId: this.userId,
        document: this.document,
      };
    }
  },
  Patch: class Patch {
    static all() {
      return [];
    }
  },
}));

let Instruments: typeof import("../../src/components/Instruments").default;

beforeAll(async () => {
  ({ default: Instruments } = await import("../../src/components/Instruments"));
});

describe("Instruments", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    instrumentAllMock.mockReset();
    instrumentDeleteMock.mockReset();
    instrumentFindMock.mockReset();
    vi.restoreAllMocks();
  });

  it("deletes a user-owned instrument from the list", async () => {
    instrumentAllMock.mockResolvedValue([
      {
        serialize: () => ({
          id: "instrument-1",
          name: "Bass Rig",
          userId: "user-1",
          document: {
            templateId: "default-performance-instrument",
            tracks: [],
          },
        }),
      },
    ]);
    instrumentFindMock.mockResolvedValue({
      id: "instrument-1",
      name: "Bass Rig",
      delete: instrumentDeleteMock.mockResolvedValue(undefined),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <Provider store={store}>
        <Instruments />
      </Provider>,
    );

    await screen.findByText("Bass Rig");

    fireEvent.click(screen.getByRole("button", { name: "Delete Bass Rig" }));

    await waitFor(() => {
      expect(instrumentFindMock).toHaveBeenCalledWith("instrument-1");
    });

    expect(instrumentDeleteMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Bass Rig")).toBeNull();
  });
});
