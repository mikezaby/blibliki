import type { IStep } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import {
  toEditorPages,
  updateInstrumentPageStep,
} from "../../../src/components/AudioModule/StepSequencer/instrumentAdapter";
import {
  createDefaultInstrumentDocument,
  type InstrumentSequencerPage,
} from "../../../src/instruments/document";

function createPages(): InstrumentSequencerPage[] {
  return createDefaultInstrumentDocument().tracks[0]!.sequencer.pages;
}

describe("instrument step sequencer editor adapter", () => {
  it("adds empty CC messages when converting instrument pages", () => {
    const pages = createPages();
    const editorPages = toEditorPages(pages);

    expect(editorPages[0]?.steps[0]).toEqual({
      ...pages[0]?.steps[0],
      ccMessages: [],
    });
  });

  it("immutably updates the selected instrument page and step", () => {
    const pages = createPages();
    const originalStep = pages[0]!.steps[0]!;
    const nextStep: IStep = {
      ...originalStep,
      active: true,
      notes: [{ note: "C3", velocity: 96 }],
      ccMessages: [],
    };

    const updated = updateInstrumentPageStep(pages, 0, 0, nextStep);

    expect(updated).not.toBe(pages);
    expect(updated[0]).not.toBe(pages[0]);
    expect(updated[0]?.steps).not.toBe(pages[0]?.steps);
    expect(updated[1]).toBe(pages[1]);
    expect(updated[0]?.steps[1]).toBe(pages[0]?.steps[1]);
    expect(updated[0]?.steps[0]).toEqual({
      active: true,
      notes: [{ note: "C3", velocity: 96 }],
      probability: 100,
      microtimeOffset: 0,
      duration: "1/16",
    });
  });

  it("does not persist editor-only CC messages", () => {
    const pages = createPages();
    const nextStep: IStep = {
      ...pages[0]!.steps[0]!,
      ccMessages: [{ cc: 1, value: 64 }],
    };

    const updated = updateInstrumentPageStep(pages, 0, 0, nextStep);

    expect(updated[0]?.steps[0]).not.toHaveProperty("ccMessages");
  });

  it("rejects engine-only infinite note durations", () => {
    const pages = createPages();
    const nextStep: IStep = {
      ...pages[0]!.steps[0]!,
      ccMessages: [],
      duration: "infinity",
    };

    expect(() => updateInstrumentPageStep(pages, 0, 0, nextStep)).toThrow(
      "Instrument sequencer steps cannot use an infinite duration",
    );
  });
});
