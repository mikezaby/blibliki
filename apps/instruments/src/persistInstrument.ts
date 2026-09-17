import type { InstrumentDocument } from "@blibliki/instrument";
import type {
  InstrumentPerformanceProps,
  InstrumentPersistenceResult,
} from "@blibliki/instrument/react";
import type { IInstrument } from "@blibliki/models";
import {
  type DeviceStorage,
  clearInstrumentDraft,
  resolveInstrumentDocument,
  saveInstrumentDraft,
} from "./instrumentStore";

type PersistAction = Parameters<
  NonNullable<InstrumentPerformanceProps["onPersist"]>
>[0];

export type PersistTarget = {
  storage: DeviceStorage;
  userId: string | undefined;
  saveRemote: (
    instrument: IInstrument,
    document: InstrumentDocument,
  ) => Promise<void>;
  loadRemote: (instrumentId: string) => Promise<IInstrument>;
};

// Only the signed-in owner writes back to Firestore. Everyone else keeps a
// draft on the device, so a visitor can never overwrite someone's instrument.
export function ownsInstrument(
  instrument: IInstrument,
  userId: string | undefined,
) {
  return userId !== undefined && instrument.userId === userId;
}

export async function persistInstrument(
  target: PersistTarget,
  instrument: IInstrument,
  action: PersistAction,
  document: InstrumentDocument,
): Promise<InstrumentPersistenceResult> {
  if (action === "saveDraft") {
    if (ownsInstrument(instrument, target.userId)) {
      await target.saveRemote(instrument, document);

      return {
        notice: {
          title: "SAVE COMPLETE",
          message: "Firestore updated",
          tone: "success",
        },
      };
    }

    saveInstrumentDraft(target.storage, instrument.id, document);

    return {
      notice: {
        title: "SAVE COMPLETE",
        message: "Draft stored on device",
        tone: "success",
      },
    };
  }

  clearInstrumentDraft(target.storage, instrument.id);
  const remote = await target.loadRemote(instrument.id);

  return {
    document: resolveInstrumentDocument(target.storage, remote),
    notice: {
      title: "DRAFT DISCARDED",
      message: "Reloaded from cloud",
      tone: "success",
    },
  };
}
