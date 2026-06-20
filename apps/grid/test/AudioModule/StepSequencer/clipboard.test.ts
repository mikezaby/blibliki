import type { IPage, IStep } from "@blibliki/engine";
import { describe, expect, it, vi } from "vitest";
import {
  SEQUENCER_CLIPBOARD_MIME,
  SEQUENCER_CLIPBOARD_TEXT_PREFIX,
  createPageClipboardPayload,
  createStepsClipboardPayload,
  pasteSequencerClipboard,
  readSequencerClipboard,
  readSequencerClipboardFromDataTransfer,
  serializeSequencerClipboard,
  writeSequencerClipboard,
  writeSequencerClipboardToDataTransfer,
} from "../../../src/components/AudioModule/StepSequencer/clipboard";

function createStep(note: string): IStep {
  return {
    active: true,
    notes: [{ note, velocity: 100 }],
    ccMessages: [{ cc: 74, value: 80 }],
    probability: 100,
    microtimeOffset: 0,
    duration: "1/16",
  };
}

function createPages(): IPage[] {
  return [
    {
      name: "Page 1",
      steps: ["C3", "D3", "E3", "F3"].map(createStep),
    },
    {
      name: "Destination",
      steps: ["G3", "A3", "B3", "C4"].map(createStep),
    },
  ];
}

function createDataTransfer() {
  const data = new Map<string, string>();

  return {
    data,
    transfer: {
      getData: vi.fn((type: string) => data.get(type) ?? ""),
      setData: vi.fn((type: string, value: string) => {
        data.set(type, value);
      }),
    },
  };
}

describe("step sequencer clipboard", () => {
  it("round-trips step payloads through custom MIME and text fallback", () => {
    const payload = createStepsClipboardPayload(createPages()[0]!.steps, 1, 2);
    const { data, transfer } = createDataTransfer();

    writeSequencerClipboardToDataTransfer(transfer, payload);

    expect(transfer.setData).toHaveBeenCalledWith(
      SEQUENCER_CLIPBOARD_MIME,
      expect.any(String),
    );
    expect(data.get("text/plain")).toContain(SEQUENCER_CLIPBOARD_TEXT_PREFIX);
    expect(readSequencerClipboardFromDataTransfer(transfer)).toEqual(payload);
  });

  it("rejects foreign and malformed clipboard data", () => {
    expect(
      readSequencerClipboardFromDataTransfer({
        getData: () => "not blibliki clipboard data",
      }),
    ).toBeNull();
  });

  it("deep clones copied steps", () => {
    const pages = createPages();
    const payload = createStepsClipboardPayload(pages[0]!.steps, 0, 0);

    payload.steps[0]!.notes[0]!.note = "X9";
    payload.steps[0]!.ccMessages[0]!.value = 1;

    expect(pages[0]!.steps[0]!.notes[0]!.note).toBe("C3");
    expect(pages[0]!.steps[0]!.ccMessages[0]!.value).toBe(80);
  });

  it("partially pastes a step phrase without crossing the page boundary", () => {
    const pages = createPages();
    const payload = createStepsClipboardPayload(pages[0]!.steps, 0, 2);

    const result = pasteSequencerClipboard(
      pages,
      1,
      { scope: "steps", start: 2, end: 2 },
      payload,
    );

    expect(result.pastedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.pages[1]?.steps.map((step) => step.notes[0]?.note)).toEqual([
      "G3",
      "A3",
      "C3",
      "D3",
    ]);
  });

  it("pastes a page while preserving the destination page name", () => {
    const pages = createPages();
    const payload = createPageClipboardPayload(pages[0]!);

    const result = pasteSequencerClipboard(
      pages,
      1,
      { scope: "page" },
      payload,
    );

    expect(result.pastedCount).toBe(4);
    expect(result.pages[1]?.name).toBe("Destination");
    expect(result.pages[1]?.steps).toEqual(pages[0]?.steps);
    expect(result.pages[1]?.steps).not.toBe(pages[0]?.steps);
  });

  it("rejects clipboard payloads that do not match the selection scope", () => {
    const pages = createPages();
    const payload = createPageClipboardPayload(pages[0]!);

    const result = pasteSequencerClipboard(
      pages,
      1,
      { scope: "steps", start: 0, end: 0 },
      payload,
    );

    expect(result.applied).toBe(false);
    expect(result.pages).toBe(pages);
  });

  it("uses the system text clipboard with an in-memory fallback", async () => {
    const payload = createStepsClipboardPayload(createPages()[0]!.steps, 0, 0);
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const readText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: { readText, writeText } },
    });

    await writeSequencerClipboard(payload);

    expect(writeText).toHaveBeenCalledWith(
      `${SEQUENCER_CLIPBOARD_TEXT_PREFIX}${serializeSequencerClipboard(payload)}`,
    );
    await expect(readSequencerClipboard()).resolves.toEqual(payload);
  });

  it("does not paste stale memory when the system clipboard contains other text", async () => {
    const payload = createStepsClipboardPayload(createPages()[0]!.steps, 0, 0);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          readText: vi.fn().mockResolvedValue("ordinary copied text"),
          writeText: vi.fn().mockRejectedValue(new Error("denied")),
        },
      },
    });

    await writeSequencerClipboard(payload);

    await expect(readSequencerClipboard()).resolves.toBeNull();
  });
});
