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
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    const instrumentId = params?.instrumentId ?? "";
    const href = to.replace("$instrumentId", instrumentId);

    return <a href={href}>{children}</a>;
  },
}));

describe("InstrumentEditor", () => {
  afterEach(() => {
    cleanup();
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

    const voicesInput = screen.getByLabelText("Voices") as HTMLInputElement;

    expect(voicesInput.value).toBe("8");

    fireEvent.change(voicesInput, { target: { value: "12" } });

    expect(voicesInput.value).toBe("12");
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

  it("separates sequencer note names from step velocity editing", () => {
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

    const notesInput = screen.getByLabelText("Notes") as HTMLInputElement;
    const velocityInput = screen.getByLabelText("Velocity") as HTMLInputElement;

    expect(notesInput.value).toBe("C3, E3");
    expect(velocityInput.value).toBe("90");

    fireEvent.change(notesInput, { target: { value: "C3, G3" } });
    fireEvent.change(velocityInput, { target: { value: "110" } });

    expect(notesInput.value).toBe("C3, G3");
    expect(velocityInput.value).toBe("110");
  });

  it("preserves a trailing comma while composing multiple sequencer notes", () => {
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

    const notesInput = screen.getByLabelText("Notes") as HTMLInputElement;

    fireEvent.change(notesInput, { target: { value: "C3," } });

    expect(notesInput.value).toBe("C3,");
  });

  it("normalizes typed note names to uppercase while editing", () => {
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

    const notesInput = screen.getByLabelText("Notes") as HTMLInputElement;

    fireEvent.change(notesInput, { target: { value: "c3, e3" } });

    expect(notesInput.value).toBe("C3, E3");
  });
});
