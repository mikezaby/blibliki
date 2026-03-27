import { describe, expect, it } from "vitest";
import { createNewInstrumentForUser } from "../../src/instruments/createInstrument";

describe("createNewInstrumentForUser", () => {
  it("creates a persisted instrument model with the default document scaffold", () => {
    const instrument = createNewInstrumentForUser("user-1");

    expect(instrument.userId).toBe("user-1");
    expect(instrument.name).toBe("Default Instrument");
    expect(instrument.document).toEqual(
      expect.objectContaining({
        name: "Default Instrument",
        globalBlock: expect.objectContaining({
          reverbSend: 0,
          delaySend: 0,
        }),
        tracks: expect.arrayContaining([
          expect.objectContaining({
            key: "track-1",
            sourceProfileId: "unassigned",
            noteSource: "externalMidi",
          }),
        ]),
      }),
    );
  });
});
