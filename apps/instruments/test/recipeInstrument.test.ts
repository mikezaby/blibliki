import type { IInstrument } from "@blibliki/models";
import { describe, expect, it } from "vitest";
import { ownsInstrument } from "../src/persistInstrument";
import {
  isRecipeInstrumentId,
  loadInstrument,
  recipeIdOf,
  recipeInstrumentId,
} from "../src/recipeInstrument";

const remoteInstrument: IInstrument = {
  id: "abc",
  name: "Stored",
  userId: "user-1",
  document: {},
};

function findRemote(instrumentId: string) {
  return instrumentId === remoteInstrument.id
    ? Promise.resolve(remoteInstrument)
    : Promise.reject(new Error(`Instrument ${instrumentId} not found`));
}

describe("recipeInstrument", () => {
  it("round trips a recipe id through the instrument id", () => {
    const instrumentId = recipeInstrumentId("groovebox");

    expect(instrumentId).toBe("recipe.groovebox");
    expect(isRecipeInstrumentId(instrumentId)).toBe(true);
    expect(isRecipeInstrumentId("abc")).toBe(false);
    expect(recipeIdOf(instrumentId)).toBe("groovebox");
  });

  it("loads a recipe from the package without asking the remote store", async () => {
    const instrument = await loadInstrument("recipe.groovebox", () => {
      throw new Error("the remote store should not be asked");
    });

    expect(instrument.id).toBe("recipe.groovebox");
    expect(instrument.name).toBe("Groovebox");
    expect(instrument.document).toMatchObject({ name: "Groovebox" });
  });

  it("gives a recipe no owner, so nobody saves over it", async () => {
    const instrument = await loadInstrument("recipe.groovebox", findRemote);

    expect(ownsInstrument(instrument, "user-1")).toBe(false);
    expect(ownsInstrument(instrument, "")).toBe(false);
    expect(ownsInstrument(instrument, undefined)).toBe(false);
  });

  it("fails on an unknown recipe the way a missing instrument does", async () => {
    await expect(loadInstrument("recipe.nope", findRemote)).rejects.toThrow(
      "Instrument recipe.nope not found",
    );
  });

  it("loads any other id from the remote store", async () => {
    await expect(loadInstrument("abc", findRemote)).resolves.toBe(
      remoteInstrument,
    );
  });
});
