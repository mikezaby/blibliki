// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstrumentPerformance from "../../src/components/Instruments/InstrumentPerformance";
import { createDefaultInstrumentDocument } from "../../src/instruments/document";

const {
  loadEngineMock,
  createInstrumentEnginePatchMock,
  createInstrumentControllerSessionMock,
  createSavedInstrumentDocumentMock,
  instrumentFindMock,
  instrumentSaveMock,
} = vi.hoisted(() => ({
  loadEngineMock: vi.fn(),
  createInstrumentEnginePatchMock: vi.fn(),
  createInstrumentControllerSessionMock: vi.fn(),
  createSavedInstrumentDocumentMock: vi.fn(),
  instrumentFindMock: vi.fn(),
  instrumentSaveMock: vi.fn(),
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

vi.mock("@blibliki/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@blibliki/engine")>();

  return {
    ...actual,
    Engine: {
      load: loadEngineMock,
    },
  };
});

vi.mock("@blibliki/instrument", () => ({
  createInstrumentEnginePatch: createInstrumentEnginePatchMock,
  createInstrumentControllerSession: createInstrumentControllerSessionMock,
  createSavedInstrumentDocument: createSavedInstrumentDocumentMock,
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

  return {
    Instrument: MockInstrument,
  };
});

describe("InstrumentPerformance", () => {
  let fullscreenElement: Element | null;
  let requestFullscreenMock: ReturnType<typeof vi.fn>;
  let exitFullscreenMock: ReturnType<typeof vi.fn>;

  const instrument = {
    id: "instrument-1",
    name: "Instrument One",
    userId: "user-1",
    document: createDefaultInstrumentDocument(),
  };
  const remoteDocument = {
    ...createDefaultInstrumentDocument(),
    name: "Remote Instrument",
  };
  const runtimePatch = {
    patch: {
      bpm: 120,
      timeSignature: [4, 4] as [number, number],
      modules: [],
      routes: [],
    },
    runtime: {
      navigation: {
        activeTrackIndex: 0,
        activePage: "sourceAmp",
        mode: "performance",
        shiftPressed: false,
        sequencerPageIndex: 0,
        selectedStepIndex: 0,
      },
    },
    compiledInstrument: {},
  };
  let displayState = {
    header: {
      instrumentName: "DEFAULT INSTRUMENT",
      trackName: "track-1",
      pageKey: "sourceAmp",
      controllerPage: 1,
      midiChannel: 1,
      transportState: "stopped",
      mode: "performance",
    },
    globalBand: { slots: [] },
    upperBand: { title: "SOURCE", slots: [] },
    lowerBand: { title: "AMP", slots: [] },
  };
  const engine = {
    serialize: vi.fn(() => ({
      bpm: 120,
      timeSignature: [4, 4],
      modules: [],
      routes: [],
    })),
    dispose: vi.fn(),
    context: {
      close: vi.fn(),
    },
    start: vi.fn(),
    stop: vi.fn(),
  };

  beforeEach(() => {
    displayState = {
      header: {
        instrumentName: "DEFAULT INSTRUMENT",
        trackName: "track-1",
        pageKey: "sourceAmp",
        controllerPage: 1,
        midiChannel: 1,
        transportState: "stopped",
        mode: "performance",
      },
      globalBand: { slots: [] },
      upperBand: { title: "SOURCE", slots: [] },
      lowerBand: { title: "AMP", slots: [] },
    };

    fullscreenElement = null;
    requestFullscreenMock = vi.fn(async function (this: Element) {
      fullscreenElement = this;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    exitFullscreenMock = vi.fn(async () => {
      fullscreenElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      writable: true,
      value: exitFullscreenMock,
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      writable: true,
      value: requestFullscreenMock,
    });

    loadEngineMock.mockReset();
    createInstrumentEnginePatchMock.mockReset();
    createInstrumentControllerSessionMock.mockReset();
    createSavedInstrumentDocumentMock.mockReset();
    instrumentFindMock.mockReset();
    instrumentSaveMock.mockReset();

    loadEngineMock.mockResolvedValue(engine);
    createInstrumentEnginePatchMock.mockReturnValue(runtimePatch);
    createSavedInstrumentDocumentMock.mockImplementation(
      (document) => document,
    );
    createInstrumentControllerSessionMock.mockImplementation(
      (_engine, _runtimePatch, options) => ({
        getDisplayState: () => displayState,
        dispose: vi.fn(),
        options,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the runtime inside a hardware-style performance console", async () => {
    const { container } = render(
      <InstrumentPerformance instrument={instrument} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Instrument One")).toBeTruthy();
    });

    expect(screen.queryByText("Performance Console")).toBeNull();
    expect(screen.getByText("Instrument One")).toBeTruthy();
    expect(screen.queryByText("DEFAULT INSTRUMENT")).toBeNull();
    expect(
      screen.queryByText("Performer-first control surface for live sets."),
    ).toBeNull();
    expect(screen.queryByText("Display Focus")).toBeNull();
    expect(screen.getByText("Track")).toBeTruthy();
    expect(screen.getAllByText("track-1")).toHaveLength(1);
    expect(screen.getByText("Page Bank")).toBeTruthy();
    expect(screen.getByText("SOURCE / AMP")).toBeTruthy();
    expect(screen.queryByText("Mode")).toBeNull();
    expect(screen.getAllByText("Transport").length).toBe(1);
    expect(screen.queryByText("Runtime")).toBeNull();
    expect(
      container
        .querySelector(".instrument-performance-faceplate")
        ?.className.includes("border"),
    ).toBe(false);
    expect(
      screen
        .getByText("Status Rail")
        .closest("aside")
        ?.className.includes("border"),
    ).toBe(false);
    expect(
      screen.getByText("Track").parentElement?.className.includes("border"),
    ).toBe(false);
    expect(
      screen
        .getByText("Global Controls")
        .closest("section")
        ?.className.includes("border"),
    ).toBe(false);
    expect(
      container
        .querySelector(".instrument-performance-display")
        ?.className.includes("border"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Start" }).hasAttribute("disabled"),
    ).toBe(false);
    expect(
      screen
        .getByRole("button", { name: "Fullscreen" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("toggles transport from the single start and stop button", async () => {
    render(<InstrumentPerformance instrument={instrument} />);

    const startButton = await screen.findByRole("button", {
      name: "Start",
    });

    fireEvent.click(startButton);

    expect(engine.start).toHaveBeenCalledTimes(1);

    displayState = {
      ...displayState,
      header: {
        ...displayState.header,
        transportState: "playing",
      },
    };

    cleanup();
    render(<InstrumentPerformance instrument={instrument} />);

    const stopButton = await screen.findByRole("button", {
      name: "Stop",
    });

    fireEvent.click(stopButton);

    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it("uses borderless slot lanes with encoder glyphs only for numeric-style values", async () => {
    displayState = {
      ...displayState,
      globalBand: {
        slots: [
          {
            key: "tempo",
            label: "Tempo",
            shortLabel: "BPM",
            cc: 13,
            valueText: "120 BPM",
            rawValue: 120,
            valueSpec: { kind: "number", min: 20, max: 240, step: 1 },
          },
          {
            key: "active",
            label: "Active",
            shortLabel: "ACT",
            cc: 14,
            valueText: "ON",
            rawValue: true,
            valueSpec: { kind: "boolean" },
          },
        ],
      },
      upperBand: {
        title: "SOURCE",
        slots: [
          {
            kind: "slot",
            blockKey: "source",
            slotKey: "freq",
            label: "Frequency",
            shortLabel: "FREQ",
            cc: 21,
            valueText: "440",
            rawValue: 440,
            valueSpec: { kind: "number", min: 20, max: 20000, exp: 2 },
          },
          {
            kind: "slot",
            blockKey: "source",
            slotKey: "wave",
            label: "Wave",
            shortLabel: "WAVE",
            cc: 22,
            valueText: "sine",
            rawValue: "sine",
            valueSpec: { kind: "enum", options: ["sine", "square"] },
          },
          { kind: "empty", valueText: "--" },
        ],
      },
      lowerBand: {
        title: "AMP",
        slots: [],
      },
    };

    const { container } = render(
      <InstrumentPerformance instrument={instrument} />,
    );

    await waitFor(() => {
      expect(screen.getByText("FREQ")).toBeTruthy();
    });

    expect(
      container
        .querySelector('[data-slot-key="global.tempo"]')
        ?.getAttribute("data-slot-layout"),
    ).toBe("encoder");
    expect(
      container
        .querySelector('[data-slot-key="global.active"]')
        ?.getAttribute("data-slot-layout"),
    ).toBe("text");
    expect(
      container
        .querySelector('[data-slot-key="source.freq"]')
        ?.getAttribute("data-slot-layout"),
    ).toBe("encoder");
    expect(
      container
        .querySelector('[data-slot-key="source.wave"]')
        ?.getAttribute("data-slot-layout"),
    ).toBe("text");
    expect(
      container
        .querySelector('[data-slot-key="upper-2"]')
        ?.getAttribute("data-slot-layout"),
    ).toBe("encoder");

    expect(
      Array.from(container.querySelectorAll("[data-slot-key]")).every(
        (slot) => {
          return !slot.className.includes("border");
        },
      ),
    ).toBe(true);
  });

  it("toggles fullscreen mode for the performance surface", async () => {
    render(<InstrumentPerformance instrument={instrument} />);

    const fullscreenButton = await screen.findByRole("button", {
      name: "Fullscreen",
    });

    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
      expect(requestFullscreenMock.mock.instances[0]).toBe(
        document.documentElement,
      );
      expect(
        screen.getByRole("button", { name: "Exit Fullscreen" }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Exit Fullscreen" }));

    await waitFor(() => {
      expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy();
    });
  });

  it("saves the current performance draft to Firestore when requested", async () => {
    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentPerformance
        instrument={instrument}
        onInstrumentChange={handleInstrumentChange}
      />,
    );

    await waitFor(() => {
      expect(createInstrumentControllerSessionMock).toHaveBeenCalledTimes(1);
    });

    const firstCall = createInstrumentControllerSessionMock.mock.calls[0];
    const options = firstCall?.[2] as {
      onPersistenceAction?: (
        action: "saveDraft" | "discardDraft",
        runtimePatch: typeof runtimePatch,
      ) => Promise<unknown>;
    };

    await act(async () => {
      const notice = await options.onPersistenceAction?.(
        "saveDraft",
        runtimePatch,
      );
      expect(notice).toEqual({
        title: "SAVE COMPLETE",
        message: "Firestore updated",
        tone: "success",
      });
    });

    expect(instrumentSaveMock).toHaveBeenCalledTimes(1);
    expect(handleInstrumentChange).toHaveBeenCalledWith(instrument);
  });

  it("reloads the remote instrument after discard and restarts with a reload notice", async () => {
    instrumentFindMock.mockResolvedValue({
      serialize: () => ({
        ...instrument,
        document: remoteDocument,
      }),
      document: remoteDocument,
    });

    const handleInstrumentChange = vi.fn();

    render(
      <InstrumentPerformance
        instrument={instrument}
        onInstrumentChange={handleInstrumentChange}
      />,
    );

    await waitFor(() => {
      expect(createInstrumentControllerSessionMock).toHaveBeenCalledTimes(1);
    });

    const firstCall = createInstrumentControllerSessionMock.mock.calls[0];
    const options = firstCall?.[2] as {
      onPersistenceAction?: (
        action: "saveDraft" | "discardDraft",
        runtimePatch: typeof runtimePatch,
      ) => Promise<unknown>;
    };

    await act(async () => {
      await options.onPersistenceAction?.("discardDraft", runtimePatch);
    });

    await waitFor(() => {
      expect(instrumentFindMock).toHaveBeenCalledWith("instrument-1");
      expect(createInstrumentControllerSessionMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = createInstrumentControllerSessionMock.mock.calls[1];
    const secondOptions = secondCall?.[2] as {
      initialDisplayNotice?: unknown;
    };

    expect(secondOptions.initialDisplayNotice).toEqual({
      title: "REMOTE RELOADED",
      message: "Local draft discarded",
      tone: "success",
    });
    expect(handleInstrumentChange).toHaveBeenCalledWith({
      ...instrument,
      document: remoteDocument,
    });
  });
});
