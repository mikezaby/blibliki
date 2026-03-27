import { TransportState } from "@blibliki/engine";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import {
  createInstrumentDisplayState,
  createInstrumentRuntimeState,
} from "@/instrumentRuntime";
import { createLiveInstrumentDisplayState } from "@/liveDisplayState";
import {
  createTerminalDisplaySession,
  renderInstrumentDisplayStateToTerminal,
} from "@/terminalDisplay";

function createSeededInstrumentDocument() {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
  };

  return document;
}

function createSequencedInstrumentDocument() {
  const document = createSeededInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    noteSource: "stepSequencer",
    sequencer: {
      ...firstTrack.sequencer,
      loopLength: 2,
      pages: [
        {
          name: "Page 1",
          steps: [
            {
              active: true,
              notes: [{ note: "C3", velocity: 80 }],
              probability: 75,
              microtimeOffset: 10,
              duration: "1/8",
            },
            ...Array.from({ length: 15 }, () => ({
              active: false,
              notes: [],
              probability: 100,
              microtimeOffset: 0,
              duration: "1/16" as const,
            })),
          ],
        },
        ...firstTrack.sequencer.pages.slice(1),
      ],
    },
  };

  return document;
}

function createPerformanceDisplayState() {
  const runtimeState = createInstrumentRuntimeState(
    createInstrumentEnginePatch(createSeededInstrumentDocument()),
  );

  return createInstrumentDisplayState(runtimeState);
}

function createSeqEditDisplayState() {
  const runtimePatch = createInstrumentEnginePatch(
    createSequencedInstrumentDocument(),
    {
      navigation: {
        activeTrackIndex: 0,
        activePage: "sourceAmp",
        mode: "seqEdit",
        shiftPressed: false,
        sequencerPageIndex: 0,
        selectedStepIndex: 0,
      },
    },
  );

  const modules = new Map(
    runtimePatch.patch.modules.map((module) => [module.id, module]),
  );

  return createLiveInstrumentDisplayState(
    {
      state: TransportState.stopped,
      findModule: (id: string) => {
        const module = modules.get(id);
        if (!module) {
          throw new Error(`Module ${id} not found`);
        }

        return module;
      },
    },
    runtimePatch,
  );
}

describe("renderInstrumentDisplayStateToTerminal", () => {
  it("renders performance mode as a four-band terminal frame with empty and inactive slots preserved", () => {
    expect(
      renderInstrumentDisplayStateToTerminal(createPerformanceDisplayState()),
    ).toBe(
      "INSTRUMENT Default Instrument | TRACK track-1 | CH 1 | PAGE 1 sourceAmp\n" +
        "MODE performance | TRANSPORT stopped\n" +
        "GLOBAL | BPM:120 BPM | SWG:0% | MCF:20000 | MRQ:1 | REV:0% | DLY:0% | [---]:[--] | VOL:100%\n" +
        "TOP SOURCE | WAVE:sine | FREQ:440 | OCT:0 | CRS:0 | FINE:0 | LOW:ON | (empty):-- | (empty):--\n" +
        "BOTTOM AMP | A:-- | D:-- | S:-- | R:-- | (empty):-- | (empty):-- | (empty):-- | GAIN:--",
    );
  });

  it("renders seq edit mode using the sequencer slot labels and values", () => {
    expect(
      renderInstrumentDisplayStateToTerminal(createSeqEditDisplayState()),
    ).toBe(
      "INSTRUMENT Default Instrument | TRACK track-1 | CH 1 | PAGE 1 sourceAmp\n" +
        "MODE seqEdit | TRANSPORT stopped\n" +
        "GLOBAL | ACT:ON | PROB:75% | DUR:1/8 | MICR:10 | RES:1/16 | MODE:loop | [---]:[--] | LOOP:2\n" +
        "TOP VELOCITY | VEL1:80 | [VEL2]:[--] | [VEL3]:[--] | [VEL4]:[--] | [VEL5]:[--] | [VEL6]:[--] | [VEL7]:[--] | [VEL8]:[--]\n" +
        "BOTTOM PITCH | N1:C3 | [N2]:[--] | [N3]:[--] | [N4]:[--] | [N5]:[--] | [N6]:[--] | [N7]:[--] | [N8]:[--]",
    );
  });
});

describe("createTerminalDisplaySession", () => {
  it("redraws the terminal in place and stops writing after dispose", () => {
    const writes: string[] = [];
    const session = createTerminalDisplaySession({
      write: (chunk: string | Uint8Array) => {
        writes.push(
          typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk),
        );
        return true;
      },
    });

    session.render(createPerformanceDisplayState());
    session.render(createSeqEditDisplayState());
    session.dispose();
    session.render(createPerformanceDisplayState());

    expect(writes).toEqual([
      "\u001b[2J\u001b[H" +
        "INSTRUMENT Default Instrument | TRACK track-1 | CH 1 | PAGE 1 sourceAmp\n" +
        "MODE performance | TRANSPORT stopped\n" +
        "GLOBAL | BPM:120 BPM | SWG:0% | MCF:20000 | MRQ:1 | REV:0% | DLY:0% | [---]:[--] | VOL:100%\n" +
        "TOP SOURCE | WAVE:sine | FREQ:440 | OCT:0 | CRS:0 | FINE:0 | LOW:ON | (empty):-- | (empty):--\n" +
        "BOTTOM AMP | A:-- | D:-- | S:-- | R:-- | (empty):-- | (empty):-- | (empty):-- | GAIN:--\n",
      "\u001b[2J\u001b[H" +
        "INSTRUMENT Default Instrument | TRACK track-1 | CH 1 | PAGE 1 sourceAmp\n" +
        "MODE seqEdit | TRANSPORT stopped\n" +
        "GLOBAL | ACT:ON | PROB:75% | DUR:1/8 | MICR:10 | RES:1/16 | MODE:loop | [---]:[--] | LOOP:2\n" +
        "TOP VELOCITY | VEL1:80 | [VEL2]:[--] | [VEL3]:[--] | [VEL4]:[--] | [VEL5]:[--] | [VEL6]:[--] | [VEL7]:[--] | [VEL8]:[--]\n" +
        "BOTTOM PITCH | N1:C3 | [N2]:[--] | [N3]:[--] | [N4]:[--] | [N5]:[--] | [N6]:[--] | [N7]:[--] | [N8]:[--]\n",
    ]);
  });
});
