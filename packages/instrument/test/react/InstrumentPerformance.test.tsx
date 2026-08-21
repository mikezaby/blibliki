// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import InstrumentPerformance, {
  createEncoderArcPath,
} from "@/react/InstrumentPerformance";

const {
  loadEngineMock,
  sendControlEventMock,
  createInstrumentEnginePatchMock,
  createInstrumentControllerSessionMock,
  createSavedInstrumentDocumentMock,
} = vi.hoisted(() => ({
  loadEngineMock: vi.fn(),
  sendControlEventMock: vi.fn(),
  createInstrumentEnginePatchMock: vi.fn(),
  createInstrumentControllerSessionMock: vi.fn(),
  createSavedInstrumentDocumentMock: vi.fn(),
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

vi.mock("@/compiler/createInstrumentEnginePatch", () => ({
  createInstrumentEnginePatch: createInstrumentEnginePatchMock,
}));

vi.mock("@/InstrumentSession", () => ({
  createInstrumentControllerSession: createInstrumentControllerSessionMock,
}));

vi.mock("@/document/SavedInstrumentDocument", () => ({
  createSavedInstrumentDocument: createSavedInstrumentDocumentMock,
}));

describe("InstrumentPerformance", () => {
  let fullscreenElement: Element | null;
  let requestFullscreenMock: ReturnType<typeof vi.fn>;
  let exitFullscreenMock: ReturnType<typeof vi.fn>;

  const instrumentDocument = createDefaultInstrumentDocument();
  const storedDocument = {
    ...createDefaultInstrumentDocument(),
    name: "Stored Instrument",
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
    compiledInstrument: { tracks: [] },
  };
  // Loose on purpose: the tests feed partial slots to exercise one render path
  // at a time, which the real Fixed8 tuples would not allow.
  type TestDisplayState = {
    header: Record<string, unknown>;
    globalBand: { slots: unknown[] };
    upperBand: { title: string; sections: unknown[]; slots: unknown[] };
    lowerBand: { title: string; sections: unknown[]; slots: unknown[] };
  };

  let displayState: TestDisplayState = {
    header: {
      instrumentName: "DEFAULT INSTRUMENT",
      trackName: "track-1",
      trackVolume: -12.5,
      pageKey: "sourceAmp",
      controllerPage: 1,
      midiChannel: 1,
      transportState: "stopped",
      mode: "performance",
    },
    globalBand: { slots: [] },
    upperBand: { title: "SOURCE", sections: [], slots: [] },
    lowerBand: { title: "AMP", sections: [], slots: [] },
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
      currentTime: 0,
    },
    start: vi.fn(),
    stop: vi.fn(),
  };

  beforeEach(() => {
    displayState = {
      header: {
        instrumentName: "DEFAULT INSTRUMENT",
        trackName: "track-1",
        trackVolume: -12.5,
        pageKey: "sourceAmp",
        controllerPage: 1,
        midiChannel: 1,
        transportState: "stopped",
        mode: "performance",
      },
      globalBand: { slots: [] },
      upperBand: { title: "SOURCE", sections: [], slots: [] },
      lowerBand: { title: "AMP", sections: [], slots: [] },
    };

    fullscreenElement = null;
    // The component only ever asks the document element to go fullscreen.
    requestFullscreenMock = vi.fn(() => {
      fullscreenElement = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    exitFullscreenMock = vi.fn(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
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
    sendControlEventMock.mockReset();

    loadEngineMock.mockResolvedValue(engine);
    createInstrumentEnginePatchMock.mockReturnValue(runtimePatch);
    createSavedInstrumentDocumentMock.mockImplementation(
      (document: unknown) => document,
    );
    createInstrumentControllerSessionMock.mockImplementation(() => ({
      getDisplayState: () => displayState,
      getRuntimePatch: () => runtimePatch,
      sendControlEvent: sendControlEventMock,
      dispose: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the runtime inside a hardware-style performance console", async () => {
    const { container } = render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
      />,
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
    expect(screen.getByText("Track Volume")).toBeTruthy();
    expect(screen.getByText("-12.5 dB")).toBeTruthy();
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
    expect(container.querySelector("aside")?.className.includes("border")).toBe(
      false,
    );
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
      container.querySelector(".instrument-performance-display"),
    ).toBeTruthy();
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
    render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
      />,
    );

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
    render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
      />,
    );

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
        sections: [],
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
        sections: [],
        slots: [],
      },
    };

    const { container } = render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
      />,
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
      container.querySelector(
        '[data-slot-key="source.freq"] path[stroke="rgb(232 121 249 / 0.95)"]',
      ),
    ).toBeTruthy();

    expect(
      Array.from(container.querySelectorAll("[data-slot-key]")).every(
        (slot) => {
          return !slot.className.includes("border");
        },
      ),
    ).toBe(true);
  });

  it("toggles fullscreen mode for the performance surface", async () => {
    render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
      />,
    );

    const fullscreenButton = await screen.findByRole("button", {
      name: "Fullscreen",
    });

    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
      expect(document.fullscreenElement).toBe(document.documentElement);
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

  it("hands the saved document to onPersist and shows the notice it returns", async () => {
    const onPersist = vi.fn(() => ({
      notice: { title: "SAVE COMPLETE", tone: "success" as const },
    }));
    createSavedInstrumentDocumentMock.mockReturnValue(storedDocument);

    render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
        onPersist={onPersist}
      />,
    );

    await waitFor(() => {
      expect(createInstrumentControllerSessionMock).toHaveBeenCalledTimes(1);
    });

    const options = createInstrumentControllerSessionMock.mock
      .calls[0]?.[2] as {
      onPersistenceAction?: (
        action: "saveDraft" | "discardDraft",
        patch: typeof runtimePatch,
      ) => Promise<unknown>;
    };

    await act(async () => {
      const notice = await options.onPersistenceAction?.(
        "saveDraft",
        runtimePatch,
      );
      // The notice goes back to the session, which puts it on the display.
      expect(notice).toEqual({ title: "SAVE COMPLETE", tone: "success" });
    });

    expect(onPersist).toHaveBeenCalledWith("saveDraft", storedDocument);
  });

  it("restarts the session on the document onPersist hands back", async () => {
    const onPersist = vi.fn(() => ({
      document: storedDocument,
      notice: { title: "RELOADED", tone: "success" as const },
    }));

    render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
        onPersist={onPersist}
      />,
    );

    await waitFor(() => {
      expect(createInstrumentControllerSessionMock).toHaveBeenCalledTimes(1);
    });

    const options = createInstrumentControllerSessionMock.mock
      .calls[0]?.[2] as {
      onPersistenceAction?: (
        action: "saveDraft" | "discardDraft",
        patch: typeof runtimePatch,
      ) => Promise<unknown>;
    };

    await act(async () => {
      await options.onPersistenceAction?.("discardDraft", runtimePatch);
    });

    await waitFor(() => {
      expect(createInstrumentControllerSessionMock).toHaveBeenCalledTimes(2);
    });

    // The replacement document is what the second session compiles from, and
    // the notice rides along so the fresh display still explains what happened.
    expect(createInstrumentEnginePatchMock).toHaveBeenLastCalledWith(
      storedDocument,
    );
    expect(
      (
        createInstrumentControllerSessionMock.mock.calls[1]?.[2] as {
          initialDisplayNotice?: unknown;
        }
      ).initialDisplayNotice,
    ).toEqual({ title: "RELOADED", tone: "success" });
  });

  it("turns an encoder cell into relative ticks on the controller session", async () => {
    // jsdom has no pointer capture; the drag only needs the call to not throw.
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    displayState.upperBand.slots = [
      {
        kind: "slot",
        blockKey: "filter",
        slotKey: "cutoff",
        label: "Cutoff",
        shortLabel: "CUT",
        cc: 21,
        valueText: "1000",
        rawValue: 1000,
        valueSpec: { kind: "number", min: 20, max: 20000 },
      },
    ];

    render(
      <InstrumentPerformance
        name="Instrument One"
        document={instrumentDocument}
      />,
    );

    const encoder = await screen.findByRole("slider", { name: "CUT" });

    fireEvent.pointerDown(encoder, { pointerId: 1, clientY: 100 });
    // 9px up at 3px per tick => 3 ticks above the pivot.
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 91 });

    expect(sendControlEventMock).toHaveBeenCalledTimes(1);
    const [event] = sendControlEventMock.mock.calls[0] as [
      { cc?: number; ccValue?: number },
    ];
    expect(event.cc).toBe(21);
    expect(event.ccValue).toBe(67);

    // Sub-tick movement accumulates instead of rounding away every frame.
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 89 });
    expect(sendControlEventMock).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 88 });
    expect(sendControlEventMock).toHaveBeenCalledTimes(2);

    fireEvent.pointerUp(encoder, { pointerId: 1 });
    fireEvent.pointerMove(encoder, { pointerId: 1, clientY: 40 });
    expect(sendControlEventMock).toHaveBeenCalledTimes(2);

    // Keyboard reaches the same path for anyone without a pointer.
    fireEvent.keyDown(encoder, { key: "ArrowDown" });
    const [downEvent] = sendControlEventMock.mock.calls[2] as [
      { cc?: number; ccValue?: number },
    ];
    expect(downEvent.ccValue).toBe(63);
  });
});

describe("createEncoderArcPath", () => {
  // Anchoring at the zero position (0.5 for a bipolar -1..1 range) makes the arc
  // fill as a band from center toward the value, not from the min end.
  it("fills from the anchor toward the value for bipolar ranges", () => {
    const start = createEncoderPoint(0.5); // center: 135 + 0.5*270 = 270deg
    const value = createEncoderPoint(0.75); // 135 + 0.75*270 = 337.5deg

    const path = createEncoderArcPath(0.75, 0.5);

    expect(path.startsWith(`M ${start.x} ${start.y}`)).toBe(true);
    expect(path.endsWith(`${value.x} ${value.y}`)).toBe(true);
  });

  it("fills backward when the value is below the anchor", () => {
    const forward = createEncoderArcPath(0.75, 0.5);
    const backward = createEncoderArcPath(0.25, 0.5);

    // Same span on the other side of center → different path, both non-empty.
    expect(backward).not.toBe("");
    expect(backward).not.toBe(forward);
  });

  it("matches legacy min-anchored behavior when anchor is 0", () => {
    expect(createEncoderArcPath(0, 0)).toBe("");
    expect(createEncoderArcPath(0.5, 0)).toContain("A 24 24 0 0 1");
  });
});

function createEncoderPoint(normalized: number) {
  const angle = ((135 + normalized * 270) * Math.PI) / 180;
  return {
    x: (32 + 24 * Math.cos(angle)).toFixed(2),
    y: (32 + 24 * Math.sin(angle)).toFixed(2),
  };
}
