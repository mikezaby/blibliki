import type { IPage, IStep } from "@blibliki/engine";

const SEQUENCER_CLIPBOARD_KIND = "blibliki-step-sequencer-clipboard";
const SEQUENCER_CLIPBOARD_VERSION = 1;

export const SEQUENCER_CLIPBOARD_MIME =
  "application/x-blibliki-step-sequencer-clipboard";
export const SEQUENCER_CLIPBOARD_TEXT_PREFIX = "blibliki:sequencer:";

export type SequencerSelection =
  | { scope: "steps"; start: number; end: number }
  | { scope: "page" };

export type SequencerClipboardPayload =
  | { kind: "steps"; steps: IStep[] }
  | { kind: "page"; steps: IStep[] };

type SequencerClipboardEnvelope = {
  kind: typeof SEQUENCER_CLIPBOARD_KIND;
  payload: SequencerClipboardPayload;
  version: typeof SEQUENCER_CLIPBOARD_VERSION;
};

type ClipboardReader = Pick<DataTransfer, "getData">;
type ClipboardWriter = Pick<DataTransfer, "setData">;
type SystemClipboard = Pick<Clipboard, "readText" | "writeText">;
let memoryClipboard: SequencerClipboardPayload | null = null;

export type SequencerPasteResult = {
  applied: boolean;
  pages: IPage[];
  pastedCount: number;
  totalCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSystemClipboard(): SystemClipboard | undefined {
  if (typeof navigator === "undefined") return;

  return (navigator as unknown as { clipboard?: SystemClipboard }).clipboard;
}

function isStep(value: unknown): value is IStep {
  if (!isRecord(value)) return false;
  if (typeof value.active !== "boolean") return false;
  if (!Array.isArray(value.notes) || !Array.isArray(value.ccMessages))
    return false;
  if (typeof value.probability !== "number") return false;
  if (typeof value.microtimeOffset !== "number") return false;
  if (typeof value.duration !== "string") return false;

  return (
    value.notes.every(
      (note) =>
        isRecord(note) &&
        typeof note.note === "string" &&
        typeof note.velocity === "number",
    ) &&
    value.ccMessages.every(
      (message) =>
        isRecord(message) &&
        typeof message.cc === "number" &&
        typeof message.value === "number",
    )
  );
}

function isPayload(value: unknown): value is SequencerClipboardPayload {
  return (
    isRecord(value) &&
    (value.kind === "steps" || value.kind === "page") &&
    Array.isArray(value.steps) &&
    value.steps.every((step) => isStep(step))
  );
}

export function createStepsClipboardPayload(
  steps: IStep[],
  start: number,
  end: number,
): SequencerClipboardPayload {
  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);

  return {
    kind: "steps",
    steps: structuredClone(steps.slice(rangeStart, rangeEnd + 1)),
  };
}

export function createPageClipboardPayload(
  page: IPage,
): SequencerClipboardPayload {
  return {
    kind: "page",
    steps: structuredClone(page.steps),
  };
}

export function serializeSequencerClipboard(
  payload: SequencerClipboardPayload,
): string {
  const envelope: SequencerClipboardEnvelope = {
    kind: SEQUENCER_CLIPBOARD_KIND,
    payload,
    version: SEQUENCER_CLIPBOARD_VERSION,
  };

  return JSON.stringify(envelope);
}

export function parseSequencerClipboard(
  serialized: string,
): SequencerClipboardPayload | null {
  try {
    const envelope = JSON.parse(serialized) as unknown;
    if (!isRecord(envelope)) return null;
    if (envelope.kind !== SEQUENCER_CLIPBOARD_KIND) return null;
    if (envelope.version !== SEQUENCER_CLIPBOARD_VERSION) return null;
    if (!isPayload(envelope.payload)) return null;

    return structuredClone(envelope.payload);
  } catch {
    return null;
  }
}

export function writeSequencerClipboardToDataTransfer(
  clipboardData: ClipboardWriter,
  payload: SequencerClipboardPayload,
): void {
  const serialized = serializeSequencerClipboard(payload);

  clipboardData.setData(SEQUENCER_CLIPBOARD_MIME, serialized);
  clipboardData.setData(
    "text/plain",
    `${SEQUENCER_CLIPBOARD_TEXT_PREFIX}${serialized}`,
  );
  memoryClipboard = structuredClone(payload);
}

export function readSequencerClipboardFromDataTransfer(
  clipboardData: ClipboardReader,
): SequencerClipboardPayload | null {
  const custom = clipboardData.getData(SEQUENCER_CLIPBOARD_MIME);
  if (custom) return parseSequencerClipboard(custom);

  const text = clipboardData.getData("text/plain");
  if (!text.startsWith(SEQUENCER_CLIPBOARD_TEXT_PREFIX)) return null;

  return parseSequencerClipboard(
    text.slice(SEQUENCER_CLIPBOARD_TEXT_PREFIX.length),
  );
}

export async function writeSequencerClipboard(
  payload: SequencerClipboardPayload,
): Promise<void> {
  memoryClipboard = structuredClone(payload);
  const serialized = `${SEQUENCER_CLIPBOARD_TEXT_PREFIX}${serializeSequencerClipboard(payload)}`;
  const clipboard = getSystemClipboard();
  if (!clipboard) return;

  try {
    await clipboard.writeText(serialized);
  } catch {
    // Clipboard permissions are optional; memory keeps toolbar copy/paste useful.
  }
}

export async function readSequencerClipboard(): Promise<SequencerClipboardPayload | null> {
  const clipboard = getSystemClipboard();
  if (!clipboard) {
    return memoryClipboard ? structuredClone(memoryClipboard) : null;
  }

  try {
    const text = await clipboard.readText();
    if (!text.startsWith(SEQUENCER_CLIPBOARD_TEXT_PREFIX)) {
      return null;
    }

    const payload = parseSequencerClipboard(
      text.slice(SEQUENCER_CLIPBOARD_TEXT_PREFIX.length),
    );
    if (payload) {
      memoryClipboard = structuredClone(payload);
    }
    return payload;
  } catch {
    // Clipboard permissions are optional; fall through to memory.
  }

  return memoryClipboard ? structuredClone(memoryClipboard) : null;
}

export function pasteSequencerClipboard(
  pages: IPage[],
  pageIndex: number,
  selection: SequencerSelection,
  payload: SequencerClipboardPayload,
): SequencerPasteResult {
  const page = pages[pageIndex];
  const compatible =
    (selection.scope === "steps" && payload.kind === "steps") ||
    (selection.scope === "page" && payload.kind === "page");

  if (!page || !compatible) {
    return {
      applied: false,
      pages,
      pastedCount: 0,
      totalCount: payload.steps.length,
    };
  }

  if (selection.scope === "page") {
    const nextPages = pages.map((currentPage, currentPageIndex) =>
      currentPageIndex === pageIndex
        ? { ...currentPage, steps: structuredClone(payload.steps) }
        : currentPage,
    );

    return {
      applied: true,
      pages: nextPages,
      pastedCount: payload.steps.length,
      totalCount: payload.steps.length,
    };
  }

  const availableCount = Math.max(0, page.steps.length - selection.start);
  const pastedSteps = payload.steps.slice(0, availableCount);
  if (pastedSteps.length === 0) {
    return {
      applied: false,
      pages,
      pastedCount: 0,
      totalCount: payload.steps.length,
    };
  }

  const nextSteps = [...page.steps];
  pastedSteps.forEach((step, offset) => {
    nextSteps[selection.start + offset] = structuredClone(step);
  });

  return {
    applied: true,
    pages: pages.map((currentPage, currentPageIndex) =>
      currentPageIndex === pageIndex
        ? { ...currentPage, steps: nextSteps }
        : currentPage,
    ),
    pastedCount: pastedSteps.length,
    totalCount: payload.steps.length,
  };
}
