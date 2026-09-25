import type { MidiInputSchema } from "@blibliki/engine";
import { moduleInfoSelector } from "@/components/AudioModule/modulesSlice";
import type { RootState } from "@/store";

const FREE_SCHEMA: MidiInputSchema = { kind: "free" };

// The notes the sequencer's "midi" output feeds. With several targets the
// first mapped one wins, since a free target takes any note anyway.
export function selectSequencerNoteSchema(
  state: RootState,
  sequencerId: string,
): MidiInputSchema {
  for (const edge of state.gridNodes.edges) {
    if (edge.source !== sequencerId || edge.sourceHandle !== "midi") continue;

    const target = moduleInfoSelector.selectById(state, edge.target);
    const schema = target?.inputs.find(
      (input) => input.name === edge.targetHandle,
    )?.schema;
    if (schema?.kind === "mapped") return schema;
  }

  return FREE_SCHEMA;
}
