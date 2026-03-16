// @vitest-environment node
import { createDefaultInstrumentDocument } from "@blibliki/instrument";
import { Instrument } from "@blibliki/models";
import { describe, expect, it } from "vitest";

describe("Instrument.build", () => {
  it("creates an instrument with bootstrap defaults", () => {
    const instrument = Instrument.build({
      document: createDefaultInstrumentDocument(),
    });

    expect(instrument.id).toBe("");
    expect(instrument.name).toBe("Untitled");
    expect(instrument.userId).toBe("");
    expect(instrument.document.tracks).toHaveLength(8);
  });
});
