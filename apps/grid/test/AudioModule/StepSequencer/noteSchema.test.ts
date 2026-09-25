import { drumMachineMidiSchema } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { selectSequencerNoteSchema } from "../../../src/components/AudioModule/StepSequencer/noteSchema";
import type { RootState } from "../../../src/store";

function createState(edges: object[]) {
  return {
    modules: {
      ids: ["drums", "synth"],
      entities: {
        drums: {
          id: "drums",
          inputs: [{ name: "midi in", schema: drumMachineMidiSchema }],
        },
        synth: {
          id: "synth",
          inputs: [{ name: "midi in", schema: { kind: "free" } }],
        },
      },
    },
    gridNodes: { edges },
  } as unknown as RootState;
}

const edgeTo = (target: string) => ({
  source: "seq",
  sourceHandle: "midi",
  target,
  targetHandle: "midi in",
});

describe("selectSequencerNoteSchema", () => {
  it("reads the mapped schema of the input the sequencer feeds", () => {
    const state = createState([edgeTo("synth"), edgeTo("drums")]);

    expect(selectSequencerNoteSchema(state, "seq")).toBe(drumMachineMidiSchema);
  });

  it("is free when the sequencer feeds nothing mapped", () => {
    const state = createState([edgeTo("synth")]);

    expect(selectSequencerNoteSchema(state, "seq")).toEqual({ kind: "free" });
    expect(selectSequencerNoteSchema(createState([]), "seq")).toEqual({
      kind: "free",
    });
  });
});
