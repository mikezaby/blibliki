import type { InstrumentDisplayNotice } from "@/display/InstrumentDisplayState";

export type InstrumentPersistenceAction = "saveDraft" | "discardDraft";

const PERSISTENCE_CONFIRM_NOTICE: Record<
  InstrumentPersistenceAction,
  InstrumentDisplayNotice
> = {
  saveDraft: {
    title: "SAVE TO CLOUD?",
    message: "SHIFT+NEXT AGAIN",
    tone: "warning",
  },
  discardDraft: {
    title: "DISCARD DRAFT?",
    message: "SHIFT+PREV AGAIN",
    tone: "warning",
  },
};

const PERSISTENCE_PROGRESS_NOTICE: Record<
  InstrumentPersistenceAction,
  InstrumentDisplayNotice
> = {
  saveDraft: {
    title: "SAVING...",
    message: "Draft -> Firestore",
    tone: "info",
  },
  discardDraft: {
    title: "RELOADING...",
    message: "Loading Firestore",
    tone: "info",
  },
};

export function createPersistenceConfirmNotice(
  action: InstrumentPersistenceAction,
) {
  return PERSISTENCE_CONFIRM_NOTICE[action];
}

export function createPersistenceProgressNotice(
  action: InstrumentPersistenceAction,
) {
  return PERSISTENCE_PROGRESS_NOTICE[action];
}

export function createPersistenceErrorNotice(
  action: InstrumentPersistenceAction,
  error: unknown,
): InstrumentDisplayNotice {
  return {
    title: action === "saveDraft" ? "SAVE FAILED" : "RELOAD FAILED",
    message: error instanceof Error ? error.message : String(error),
    tone: "error",
  };
}
