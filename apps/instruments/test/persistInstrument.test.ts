import { createDefaultInstrumentDocument } from "@blibliki/instrument";
import type { IInstrument } from "@blibliki/models";
import { describe, expect, it, vi } from "vitest";
import { loadInstrumentDraft } from "../src/instrumentStore";
import {
  persistInstrument,
  type PersistTarget,
} from "../src/persistInstrument";

function createStorage() {
  const items = new Map<string, string>();

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}

const instrument: IInstrument = {
  id: "one",
  name: "Stored name",
  userId: "owner",
  document: createDefaultInstrumentDocument(),
};

const edited = { ...createDefaultInstrumentDocument(), name: "Edited" };

function createTarget(userId: string | undefined): PersistTarget {
  return {
    storage: createStorage(),
    userId,
    saveRemote: vi.fn(() => Promise.resolve()),
    loadRemote: vi.fn(() =>
      Promise.resolve({
        ...instrument,
        document: { ...instrument.document, name: "Remote name" },
      }),
    ),
  };
}

describe("persistInstrument", () => {
  it("writes to Firestore for the signed-in owner", async () => {
    const target = createTarget("owner");

    const result = await persistInstrument(
      target,
      instrument,
      "saveDraft",
      edited,
    );

    expect(target.saveRemote).toHaveBeenCalledWith(instrument, edited);
    expect(loadInstrumentDraft(target.storage, "one")).toBeUndefined();
    expect(result.notice?.message).toBe("Firestore updated");
  });

  it("keeps a device draft for a signed-in visitor who is not the owner", async () => {
    const target = createTarget("someone-else");

    const result = await persistInstrument(
      target,
      instrument,
      "saveDraft",
      edited,
    );

    expect(target.saveRemote).not.toHaveBeenCalled();
    expect(loadInstrumentDraft(target.storage, "one")?.name).toBe("Edited");
    expect(result.notice?.message).toBe("Draft stored on device");
  });

  it("keeps a device draft when nobody is signed in", async () => {
    const target = createTarget(undefined);

    await persistInstrument(target, instrument, "saveDraft", edited);

    expect(target.saveRemote).not.toHaveBeenCalled();
    expect(loadInstrumentDraft(target.storage, "one")?.name).toBe("Edited");
  });

  it("discards the draft and reloads from the cloud", async () => {
    const target = createTarget(undefined);
    await persistInstrument(target, instrument, "saveDraft", edited);

    const result = await persistInstrument(
      target,
      instrument,
      "discardDraft",
      edited,
    );

    expect(loadInstrumentDraft(target.storage, "one")).toBeUndefined();
    expect(result.document?.name).toBe("Remote name");
  });
});
