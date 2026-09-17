import type { IInstrument } from "@blibliki/models";
import { describe, expect, it } from "vitest";
import { filterInstruments } from "../src/filterInstruments";

function createInstrument(name: string): IInstrument {
  return { id: name, name, userId: "user-1", document: {} };
}

const instruments = [
  createInstrument("Bass Machine"),
  createInstrument("Deep Bass"),
  createInstrument("Lead Synth"),
];

describe("filterInstruments", () => {
  it("returns everything for an empty or blank query", () => {
    expect(filterInstruments(instruments, "")).toHaveLength(3);
    expect(filterInstruments(instruments, "   ")).toHaveLength(3);
  });

  it("matches case-insensitively on part of a name", () => {
    expect(filterInstruments(instruments, "bass").map((i) => i.name)).toEqual([
      "Bass Machine",
      "Deep Bass",
    ]);
  });

  it("narrows as more terms are typed, in any order", () => {
    expect(
      filterInstruments(instruments, "bass deep").map((i) => i.name),
    ).toEqual(["Deep Bass"]);
  });

  it("returns nothing when a term matches no name", () => {
    expect(filterInstruments(instruments, "bass piano")).toEqual([]);
  });
});
