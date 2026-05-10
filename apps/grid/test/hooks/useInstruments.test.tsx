// @vitest-environment jsdom
import { Instrument } from "@blibliki/models";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInstruments } from "../../src/hooks";

const { instrumentAllMock, instrumentSaveMock, instrumentDeleteMock } =
  vi.hoisted(() => ({
    instrumentAllMock: vi.fn(),
    instrumentSaveMock: vi.fn(),
    instrumentDeleteMock: vi.fn(),
  }));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    getToken: vi.fn(),
  }),
  useUser: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  signInWithCustomToken: vi.fn(),
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

    constructor({
      id,
      name,
      userId,
      document,
    }: {
      id: string;
      name: string;
      userId: string;
      document: Record<string, unknown>;
    }) {
      this.id = id;
      this.name = name;
      this.userId = userId;
      this.document = document;
    }

    async save() {
      await instrumentSaveMock(this.id);
    }

    async delete() {
      await instrumentDeleteMock(this.id);
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

function createInstrument(id: string, name: string) {
  return {
    id,
    name,
    userId: "user-1",
    document: {
      templateId: "default-performance-instrument",
      tracks: [],
    },
  };
}

describe("useInstruments", () => {
  afterEach(() => {
    instrumentAllMock.mockReset();
    instrumentSaveMock.mockReset();
    instrumentDeleteMock.mockReset();
  });

  it("uses hook state as the source of truth for instrument mutations", async () => {
    const bass = createInstrument("instrument-1", "Bass Rig");
    const lead = createInstrument("instrument-2", "Lead Rig");
    instrumentAllMock.mockResolvedValue([
      { serialize: () => bass },
      { serialize: () => lead },
    ]);

    const { result } = renderHook(() => useInstruments());

    await waitFor(() => {
      expect(result.current.instruments.map(({ name }) => name)).toEqual([
        "Bass Rig",
        "Lead Rig",
      ]);
    });

    await act(async () => {
      await result.current.addInstrument(
        new Instrument(createInstrument("instrument-3", "Pad Rig")),
      );
    });

    expect(result.current.instruments.map(({ name }) => name)).toEqual([
      "Bass Rig",
      "Lead Rig",
      "Pad Rig",
    ]);

    await act(async () => {
      await result.current.updateInstrument(
        new Instrument({
          ...lead,
          name: "Updated Lead",
        }),
      );
    });

    expect(result.current.instruments.map(({ name }) => name)).toEqual([
      "Bass Rig",
      "Updated Lead",
      "Pad Rig",
    ]);

    await act(async () => {
      await result.current.deleteInstrument("instrument-1");
    });

    expect(result.current.instruments.map(({ name }) => name)).toEqual([
      "Updated Lead",
      "Pad Rig",
    ]);
    expect(instrumentSaveMock).toHaveBeenCalledWith("instrument-3");
    expect(instrumentSaveMock).toHaveBeenCalledWith("instrument-2");
    expect(instrumentDeleteMock).toHaveBeenCalledWith("instrument-1");
  });
});
