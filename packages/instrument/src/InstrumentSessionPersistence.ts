import type { InstrumentDisplayNotice } from "@/display/InstrumentDisplayState";
import type { CompiledInstrumentEnginePatch } from "./compiler/instrumentTypes";

export type InstrumentPersistenceAction = "saveDraft" | "discardDraft";

export type RunInstrumentPersistenceAction = (
  action: InstrumentPersistenceAction,
  runtimePatch: CompiledInstrumentEnginePatch,
) =>
  | Promise<InstrumentDisplayNotice | undefined>
  | InstrumentDisplayNotice
  | undefined;

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

export type InstrumentSessionPersistenceFlowOptions = {
  isDisposed: () => boolean;
  onNoticeChange: (notice: InstrumentDisplayNotice | undefined) => void;
  onStateChange: () => void;
  onRunAction?: RunInstrumentPersistenceAction;
};

export class InstrumentSessionPersistenceFlow {
  private pendingAction: InstrumentPersistenceAction | null = null;
  private actionInFlight = false;

  constructor(
    private readonly options: InstrumentSessionPersistenceFlowOptions,
  ) {}

  getPendingAction() {
    return this.pendingAction;
  }

  clearPendingAction() {
    this.pendingAction = null;
    this.options.onNoticeChange(undefined);
  }

  async requestAction(
    action: InstrumentPersistenceAction,
    runtimePatch: CompiledInstrumentEnginePatch,
  ) {
    if (this.actionInFlight) {
      this.options.onStateChange();
      return;
    }

    if (this.pendingAction !== action) {
      this.pendingAction = action;
      this.options.onNoticeChange(createPersistenceConfirmNotice(action));
      this.options.onStateChange();
      return;
    }

    this.pendingAction = null;
    this.actionInFlight = true;
    this.options.onNoticeChange(createPersistenceProgressNotice(action));
    this.options.onStateChange();

    try {
      const nextNotice = await this.options.onRunAction?.(action, runtimePatch);
      if (this.options.isDisposed()) {
        return;
      }

      this.options.onNoticeChange(nextNotice);
      this.options.onStateChange();
    } catch (error) {
      if (this.options.isDisposed()) {
        return;
      }

      this.options.onNoticeChange(createPersistenceErrorNotice(action, error));
      this.options.onStateChange();
    } finally {
      this.actionInFlight = false;
    }
  }
}
