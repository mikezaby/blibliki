// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstrumentPerformance from "../../src/components/Instruments/InstrumentPerformance";
import { createDefaultInstrumentDocument } from "../../src/instruments/document";

const {
  performanceConsoleMock,
  instrumentFindMock,
  instrumentSaveMock,
  instrumentConstructorMock,
} = vi.hoisted(() => ({
  performanceConsoleMock: vi.fn(),
  instrumentFindMock: vi.fn(),
  instrumentSaveMock: vi.fn(),
  instrumentConstructorMock: vi.fn(),
}));

// The console itself is covered in @blibliki/instrument; here only the props
// grid feeds it — its storage and its way back to the editor — matter.
vi.mock("@blibliki/instrument/react", () => ({
  InstrumentPerformance: (props: Record<string, unknown>) => {
    performanceConsoleMock(props);
    return <div data-testid="console">{props.backSlot as ReactNode}</div>;
  },
}));

// The Visuals button reads the engine id from the store; it has its own
// worker and popup and is not what this test is about.
vi.mock("../../src/components/Instruments/VisualsButton", () => ({
  default: () => null,
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
  }) => (
    <a href={to.replace("$instrumentId", params?.instrumentId ?? "")}>
      {children}
    </a>
  ),
}));

vi.mock("@blibliki/models", () => {
  class MockInstrument {
    static find = instrumentFindMock;

    id: string;
    name: string;
    userId: string;
    document: Record<string, unknown>;

    constructor(props: {
      id: string;
      name: string;
      userId: string;
      document: Record<string, unknown>;
    }) {
      instrumentConstructorMock(props);
      this.id = props.id;
      this.name = props.name;
      this.userId = props.userId;
      this.document = props.document;
    }

    save = instrumentSaveMock;

    serialize() {
      return {
        id: this.id,
        name: this.name,
        userId: this.userId,
        document: this.document,
      };
    }
  }

  return { Instrument: MockInstrument };
});

type PersistProps = {
  name: string;
  document: Record<string, unknown>;
  onPersist: (
    action: "saveDraft" | "discardDraft",
    document: Record<string, unknown>,
  ) => Promise<{ notice?: unknown; document?: unknown } | undefined>;
};

describe("InstrumentPerformance", () => {
  const instrument = {
    id: "instrument-1",
    name: "Instrument One",
    userId: "user-1",
    document: createDefaultInstrumentDocument(),
  };
  const savedDocument = { ...createDefaultInstrumentDocument(), name: "Saved" };
  const remoteDocument = {
    ...createDefaultInstrumentDocument(),
    name: "Remote",
  };

  beforeEach(() => {
    performanceConsoleMock.mockReset();
    instrumentFindMock.mockReset();
    instrumentSaveMock.mockReset();
    instrumentConstructorMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("passes the instrument name, document and a link back to the editor", () => {
    render(<InstrumentPerformance instrument={instrument} />);

    const props = performanceConsoleMock.mock.calls[0]?.[0] as PersistProps;
    expect(props.name).toBe("Instrument One");
    expect(props.document).toBe(instrument.document);
    expect(
      screen.getByRole("link", { name: /Back to Editor/ }).getAttribute("href"),
    ).toBe("/instrument/instrument-1");
  });

  it("saves a draft to Firestore and reports it back to the console", async () => {
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentPerformance
        instrument={instrument}
        onInstrumentChange={handleInstrumentChange}
      />,
    );

    const { onPersist } = performanceConsoleMock.mock
      .calls[0]?.[0] as PersistProps;
    const result = await onPersist("saveDraft", savedDocument);

    expect(instrumentConstructorMock).toHaveBeenCalledWith({
      ...instrument,
      document: savedDocument,
    });
    expect(instrumentSaveMock).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith({
      ...instrument,
      document: savedDocument,
    });
    expect(result).toEqual({
      notice: {
        title: "SAVE COMPLETE",
        message: "Firestore updated",
        tone: "success",
      },
    });
  });

  it("hands the remote document back on discard so the session restarts on it", async () => {
    instrumentFindMock.mockResolvedValue({
      document: remoteDocument,
      serialize: () => ({ ...instrument, document: remoteDocument }),
    });
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentPerformance
        instrument={instrument}
        onInstrumentChange={handleInstrumentChange}
      />,
    );

    const { onPersist } = performanceConsoleMock.mock
      .calls[0]?.[0] as PersistProps;
    const result = await onPersist("discardDraft", savedDocument);

    await waitFor(() => {
      expect(instrumentFindMock).toHaveBeenCalledWith("instrument-1");
    });
    expect(handleInstrumentChange).toHaveBeenCalledWith({
      ...instrument,
      document: remoteDocument,
    });
    expect(result).toEqual({
      document: remoteDocument,
      notice: {
        title: "REMOTE RELOADED",
        message: "Local draft discarded",
        tone: "success",
      },
    });
  });
});
