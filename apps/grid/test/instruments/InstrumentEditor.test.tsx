// @vitest-environment jsdom
import { Instrument } from "@blibliki/models";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import InstrumentEditor from "../../src/components/Instruments/InstrumentEditor";
import { createDefaultInstrumentDocument } from "../../src/instruments/document";
import { store } from "../../src/store";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
  }) => {
    const instrumentId = params?.instrumentId ?? "";
    const href = to.replace("$instrumentId", instrumentId);
    const searchParams = new URLSearchParams();

    Object.entries(search ?? {}).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      searchParams.set(key, String(value));
    });

    return (
      <a href={searchParams.size > 0 ? `${href}?${searchParams}` : href}>
        {children}
      </a>
    );
  },
}));

describe("InstrumentEditor", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a debug-in-grid entrypoint for the current instrument", () => {
    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    expect(
      screen.getByRole("link", { name: "Debug in Grid" }).getAttribute("href"),
    ).toBe("/instrument/instrument-1/debug");
  });

  it("renders a performance entrypoint for the current instrument", () => {
    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    expect(
      screen.getByRole("link", { name: "Performance" }).getAttribute("href"),
    ).toBe("/instrument/instrument-1/performance");
  });

  it("renders the track enabled switch in the active track card header", () => {
    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    const toggle = screen.getByRole("switch", { name: "Enable track" });

    expect(toggle).toBeDefined();
    expect(toggle.closest(".ui-card-header")).not.toBeNull();
  });

  it("renders numeric controls as faders instead of spinboxes", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];

    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "osc",
      controllerSlotValues: {
        "fx1.drive": 0.72,
      },
    } as typeof firstTrack & {
      controllerSlotValues: Record<string, string | number | boolean>;
    };

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document,
          }}
        />
      </Provider>,
    );

    expect(screen.getByRole("slider", { name: "Voices" })).toBeDefined();
    expect(screen.getByRole("slider", { name: "Drive" })).toBeDefined();
    expect(screen.getByRole("slider", { name: "Probability" })).toBeDefined();
    expect(screen.queryByRole("spinbutton", { name: "Voices" })).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: "Drive" })).toBeNull();
    expect(
      screen.queryByRole("spinbutton", { name: "Probability" }),
    ).toBeNull();
  });

  it("allows editing the active track voices", () => {
    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    const voicesInput = screen.getByRole("slider", {
      name: "Voices",
    }) as HTMLInputElement;

    expect(voicesInput.value).toBe("8");

    fireEvent.change(voicesInput, { target: { value: "12" } });

    expect(voicesInput.value).toBe("12");
  });

  it("offers the drum machine source profile in the track editor", () => {
    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    const sourceProfileValue = screen.getByText("unassigned");
    const sourceProfileTrigger =
      sourceProfileValue.closest('[role="combobox"]') ??
      sourceProfileValue.closest("button");

    if (!(sourceProfileTrigger instanceof HTMLElement)) {
      throw new Error("Expected source profile trigger button");
    }

    sourceProfileTrigger.focus();
    fireEvent.keyDown(sourceProfileTrigger, { key: "ArrowDown" });

    expect(screen.getByRole("option", { name: "drumMachine" })).toBeDefined();
  });

  it("saves the selected latency mode with the instrument document", async () => {
    const saveSpy = vi.spyOn(Instrument.prototype, "save").mockResolvedValue();

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    const latencyValue = screen.getByText("interactive");
    const latencyTrigger =
      latencyValue.closest('[role="combobox"]') ??
      latencyValue.closest("button");

    if (!(latencyTrigger instanceof HTMLElement)) {
      throw new Error("Expected latency trigger button");
    }

    latencyTrigger.focus();
    fireEvent.keyDown(latencyTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "playback" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Instrument" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedInstrument = saveSpy.mock.instances[0] as Instrument;
    const savedDocument = savedInstrument.document as {
      latencyHint?: string;
    };

    expect(savedDocument.latencyHint).toBe("playback");
  });

  it("renders controller-editable track slots and saves their values", async () => {
    const saveSpy = vi.spyOn(Instrument.prototype, "save").mockResolvedValue();
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];

    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "osc",
      controllerSlotValues: {
        "fx1.drive": 0.72,
      },
    } as typeof firstTrack & {
      controllerSlotValues: Record<string, string | number | boolean>;
    };

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document,
          }}
        />
      </Provider>,
    );

    const driveInput = screen.getByLabelText("Drive") as HTMLInputElement;

    expect(driveInput.value).toBe("0.72");

    fireEvent.change(driveInput, { target: { value: "0.91" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Instrument" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedInstrument = saveSpy.mock.instances[0] as Instrument;
    const savedDocument = savedInstrument.document as {
      tracks?: Array<{
        controllerSlotValues?: Record<string, string | number | boolean>;
      }>;
    };

    expect(savedDocument.tracks?.[0]?.controllerSlotValues).toMatchObject({
      "fx1.drive": 0.91,
    });
  });

  it("saves the selected wavetable preset for wavetable tracks", async () => {
    const saveSpy = vi.spyOn(Instrument.prototype, "save").mockResolvedValue();
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];

    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "wavetable",
      controllerSlotValues: {
        "source.presetId": "warm-morph",
      },
    };

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document,
          }}
        />
      </Provider>,
    );

    const presetValue = screen.getByText("Warm Morph");
    const presetTrigger =
      presetValue.closest('[role="combobox"]') ?? presetValue.closest("button");

    if (!(presetTrigger instanceof HTMLElement)) {
      throw new Error("Expected wavetable preset trigger button");
    }

    presetTrigger.focus();
    fireEvent.keyDown(presetTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Glass Bell" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Instrument" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedInstrument = saveSpy.mock.instances[0] as Instrument;
    const savedDocument = savedInstrument.document as {
      tracks?: Array<{
        controllerSlotValues?: Record<string, string | number | boolean>;
        sourceSettings?: unknown;
      }>;
    };

    expect(savedDocument.tracks?.[0]?.controllerSlotValues).toMatchObject({
      "source.presetId": "glass-bell",
    });
    expect(savedDocument.tracks?.[0]?.sourceSettings).toBeUndefined();
  });

  it("uses the shared step editor for instrument sequencer content", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      noteSource: "stepSequencer",
      sequencer: {
        ...firstTrack.sequencer,
        pages: [
          {
            ...firstTrack.sequencer.pages[0]!,
            steps: [
              {
                active: true,
                notes: [
                  { note: "C3", velocity: 90 },
                  { note: "E3", velocity: 90 },
                ],
                probability: 75,
                microtimeOffset: 4,
                duration: "1/16",
              },
              ...firstTrack.sequencer.pages[0]!.steps.slice(1),
            ],
          },
          ...firstTrack.sequencer.pages.slice(1),
        ],
      },
    };

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document,
          }}
        />
      </Provider>,
    );

    const velocityInputs = screen.getAllByLabelText(
      "Velocity",
    ) as HTMLInputElement[];

    expect(screen.getByRole("button", { name: "Step 1" })).toBeDefined();
    expect(screen.getByText("C3")).toBeDefined();
    expect(screen.getByText("E3")).toBeDefined();
    expect(velocityInputs.map((input) => input.value)).toEqual(["90", "90"]);

    fireEvent.change(velocityInputs[0]!, { target: { value: "110" } });

    expect(
      (screen.getAllByLabelText("Velocity") as HTMLInputElement[]).map(
        (input) => input.value,
      ),
    ).toEqual(["110", "90"]);
  });

  it("does not carry configured step content between instrument tracks", async () => {
    const saveSpy = vi.spyOn(Instrument.prototype, "save").mockResolvedValue();
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];

    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sequencer: {
        ...firstTrack.sequencer,
        pages: [
          {
            ...firstTrack.sequencer.pages[0]!,
            steps: [
              {
                ...firstTrack.sequencer.pages[0]!.steps[0]!,
                active: true,
                notes: [{ note: "C3", velocity: 90 }],
              },
              ...firstTrack.sequencer.pages[0]!.steps.slice(1),
            ],
          },
          ...firstTrack.sequencer.pages.slice(1),
        ],
      },
    };

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document,
          }}
        />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText("Velocity"), {
      target: { value: "91" },
    });
    fireEvent.click(screen.getByRole("button", { name: "track-2" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Activate step" })[0]!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Instrument" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedInstrument = saveSpy.mock.instances[0] as Instrument;
    const savedDocument = savedInstrument.document as ReturnType<
      typeof createDefaultInstrumentDocument
    >;

    expect(
      savedDocument.tracks[1]?.sequencer.pages[0]?.steps[0]?.notes,
    ).toEqual([]);
  });

  it("adds normalized notes and saves instrument-only step data", async () => {
    const saveSpy = vi.spyOn(Instrument.prototype, "save").mockResolvedValue();
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];
    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      noteSource: "stepSequencer",
    };

    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document,
          }}
        />
      </Provider>,
    );

    const noteInput = screen.getByPlaceholderText(
      "Add note (e.g., C4, D#4, E4)...",
    );
    fireEvent.change(noteInput, { target: { value: "c3" } });
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Instrument" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    const savedInstrument = saveSpy.mock.instances[0] as Instrument;
    const savedStep = (
      savedInstrument.document as ReturnType<
        typeof createDefaultInstrumentDocument
      >
    ).tracks[0]?.sequencer.pages[0]?.steps[0];

    expect(savedStep?.notes).toEqual([{ note: "C3", velocity: 100 }]);
    expect(savedStep).not.toHaveProperty("ccMessages");
  });

  it("only offers engine-supported sequencer playback modes", () => {
    render(
      <Provider store={store}>
        <InstrumentEditor
          instrument={{
            id: "instrument-1",
            name: "Broken Instrument",
            userId: "user-1",
            document: createDefaultInstrumentDocument(),
          }}
        />
      </Provider>,
    );

    const playbackModeValue = screen.getByText("Loop");
    const playbackModeTrigger =
      playbackModeValue.closest('[role="combobox"]') ??
      playbackModeValue.closest("button");

    if (!(playbackModeTrigger instanceof HTMLElement)) {
      throw new Error("Expected playback mode trigger button");
    }

    playbackModeTrigger.focus();
    fireEvent.keyDown(playbackModeTrigger, { key: "ArrowDown" });

    expect(screen.getByRole("option", { name: "One-Shot" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "random" })).toBeNull();
    expect(screen.queryByRole("option", { name: "pingPong" })).toBeNull();
  });
});
