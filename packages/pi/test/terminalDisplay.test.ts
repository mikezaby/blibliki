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
  it("renders performance mode as a dashboard with separate label, value, and encoder-visual rows", () => {
    const rendered = renderInstrumentDisplayStateToTerminal(
      createPerformanceDisplayState(),
    );

    expect(rendered).toMatch(
      /GLOBAL[\s\S]*\n.*BPM.*SWG.*MCF.*MRQ.*REV.*DLY.*\[---\].*VOL.*\n.*120 BPM.*0%.*20000.*1.*0%.*0%.*\[--\].*100%.*\n.*o.*----.*\n/,
    );
    expect(rendered).toMatch(
      /SOURCE[\s\S]*\n.*WAVE.*FREQ.*OCT.*CRS.*FINE.*LOW.*\n.*sine.*440.*0.*0.*0.*ON.*--.*--.*\n.*o.*----.*\n/,
    );
    expect(rendered).toMatch(
      /AMP[\s\S]*\n.*A.*D.*S.*R.*GAIN.*\n.*--.*--.*--.*--.*--.*--.*--.*--.*\n.*----.*\n\+/,
    );
  });

  it("renders seq edit mode using the same dashboard structure", () => {
    const rendered = renderInstrumentDisplayStateToTerminal(
      createSeqEditDisplayState(),
    );

    expect(rendered).toMatch(
      /GLOBAL[\s\S]*\n.*ACT.*PROB.*DUR.*MICR.*RES.*MODE.*\[---\].*LOOP.*\n.*ON.*75%.*1\/8.*10.*1\/16.*loop.*\[--\].*2.*\n.*o.*----.*\n/,
    );
    expect(rendered).toMatch(
      /VELOCITY[\s\S]*\n.*VEL1.*\[VEL2\].*\[VEL8\].*\n.*80.*\[--\].*\[--\].*\n.*o.*----.*\n/,
    );
    expect(rendered).toMatch(
      /PITCH[\s\S]*\n.*N1.*\[N2\].*\[N8\].*\n.*C3.*\[--\].*\[--\].*\n.*o.*----.*\n\+/,
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

    const performanceFrame = renderInstrumentDisplayStateToTerminal(
      createPerformanceDisplayState(),
    );
    const seqEditFrame = renderInstrumentDisplayStateToTerminal(
      createSeqEditDisplayState(),
    );

    expect(writes).toEqual([
      `\u001b[2J\u001b[H${performanceFrame}\n`,
      `\u001b[2J\u001b[H${seqEditFrame}\n`,
    ]);
  });
});
