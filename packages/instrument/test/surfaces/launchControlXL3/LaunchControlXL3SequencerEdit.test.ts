import { type IStepSequencerProps, ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { createInstrumentEnginePatch } from "@/compiler/createInstrumentEnginePatch";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import type { InstrumentDocument } from "@/document/types";
import { LaunchControlXL3SequencerEdit } from "@/surfaces/launchControlXL3/LaunchControlXL3SequencerEdit";

function createStepSequencerInstrumentDocument(): InstrumentDocument {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  const firstPage = firstTrack.sequencer.pages[0];
  const firstStep = firstPage?.steps[0];
  if (!firstPage || !firstStep) {
    throw new Error("Expected default sequencer to include a first step");
  }

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
    noteSource: "stepSequencer",
    sequencer: {
      ...firstTrack.sequencer,
      pages: firstTrack.sequencer.pages.map((page, pageIndex) =>
        pageIndex === 0
          ? {
              ...page,
              steps: page.steps.map((step, stepIndex) =>
                stepIndex === 0
                  ? {
                      ...step,
                      active: true,
                      notes: [{ note: "C3", velocity: 80 }],
                    }
                  : step,
              ),
            }
          : page,
      ),
    },
  };

  return document;
}

describe("LaunchControlXL3SequencerEdit", () => {
  it("creates a sequencer edit display for the held step", () => {
    const sequencerEdit = new LaunchControlXL3SequencerEdit();
    const runtimePatch = createInstrumentEnginePatch(
      createStepSequencerInstrumentDocument(),
      {
        navigation: {
          mode: "seqEdit",
          heldSteps: [{ stepIndex: 0, pressedAt: 0, edited: false }],
        },
      },
    );

    const displayState = sequencerEdit.createDisplayState(runtimePatch);

    expect(displayState?.header.mode).toBe("seqEdit");
    expect(displayState?.header.heldSteps).toEqual([0]);
    expect(displayState?.upperBand.sections[0]?.label).toBe("Step 1");
    expect(displayState?.globalBand.slots[0]).toEqual(
      expect.objectContaining({
        key: "active",
        valueText: "ON",
      }),
    );
    expect(displayState?.upperBand.slots[0]).toEqual(
      expect.objectContaining({
        slotKey: "velocity-1",
        valueText: "80",
      }),
    );
    expect(displayState?.lowerBand.slots[0]).toEqual(
      expect.objectContaining({
        slotKey: "pitch-1",
        valueText: "C3",
      }),
    );
  });

  it("shows the defaults when nothing is held", () => {
    const sequencerEdit = new LaunchControlXL3SequencerEdit();
    const runtimePatch = createInstrumentEnginePatch(
      createStepSequencerInstrumentDocument(),
      {
        navigation: {
          mode: "seqEdit",
          stepDefaults: { "track-1": { probability: 60 } },
        },
      },
    );

    const displayState = sequencerEdit.createDisplayState(runtimePatch);

    expect(displayState?.header.heldSteps).toEqual([]);
    expect(displayState?.upperBand.sections[0]?.label).toBe("Defaults");
    expect(displayState?.globalBand.slots[0]).toEqual(
      expect.objectContaining({
        key: "active",
        valueText: "--",
        inactive: true,
      }),
    );
    expect(displayState?.globalBand.slots[1]).toEqual(
      expect.objectContaining({ key: "probability", valueText: "60%" }),
    );
    expect(displayState?.upperBand.slots[0]).toEqual(
      expect.objectContaining({ slotKey: "velocity-1", valueText: "80" }),
    );
    expect(displayState?.upperBand.slots[1]).toEqual(
      expect.objectContaining({ slotKey: "velocity-2", inactive: true }),
    );
    expect(displayState?.lowerBand.slots[0]).toEqual(
      expect.objectContaining({ slotKey: "pitch-1", valueText: "C3" }),
    );
  });

  it("lights held steps fully, active steps dim and inactive steps off", () => {
    const sequencerEdit = new LaunchControlXL3SequencerEdit();
    const document = createStepSequencerInstrumentDocument();
    const page = document.tracks[0]!.sequencer.pages[0]!;
    page.steps[1] = {
      ...page.steps[1]!,
      active: false,
      notes: [{ note: "D3", velocity: 80 }],
    };
    const runtimePatch = createInstrumentEnginePatch(document, {
      navigation: {
        mode: "seqEdit",
        heldSteps: [{ stepIndex: 3, pressedAt: 0, edited: false }],
      },
    });
    const ledValues = new Map<number, number>();

    sequencerEdit.syncStepButtonLeds(
      {
        findModule: () => ({
          moduleType: ModuleType.MidiOutput,
          onMidiEvent: (event) => {
            ledValues.set(event.cc!, event.ccValue!);
          },
        }),
      },
      runtimePatch,
    );

    expect([37, 38, 39, 40].map((cc) => ledValues.get(cc))).toEqual([
      64, 0, 0, 127,
    ]);
  });

  it("applies encoder events to the held sequencer step", () => {
    const sequencerEdit = new LaunchControlXL3SequencerEdit();
    const runtimePatch = createInstrumentEnginePatch(
      createStepSequencerInstrumentDocument(),
      {
        navigation: {
          mode: "seqEdit",
          heldSteps: [{ stepIndex: 0, pressedAt: 0, edited: false }],
        },
      },
    );

    const result = sequencerEdit.applyEncoderEvent(runtimePatch, 21, 66);

    expect(result?.update?.id).toBe("track-1.runtime.stepSequencer");
    expect(result?.update?.moduleType).toBe(ModuleType.StepSequencer);
    const stepSequencer = result?.runtimePatch.patch.modules.find(
      (module) => module.id === "track-1.runtime.stepSequencer",
    );
    if (stepSequencer?.moduleType !== ModuleType.StepSequencer) {
      throw new Error("Expected step sequencer update");
    }

    const stepSequencerProps = stepSequencer.props as IStepSequencerProps;
    expect(
      stepSequencerProps.patterns[0]?.pages[0]?.steps[0]?.notes[0],
    ).toEqual({
      note: "C3",
      velocity: 82,
    });
  });

  it("creates a page sync update for the active step sequencer", () => {
    const sequencerEdit = new LaunchControlXL3SequencerEdit();
    const runtimePatch = createInstrumentEnginePatch(
      createStepSequencerInstrumentDocument(),
      {
        navigation: {
          mode: "seqEdit",
          sequencerPageIndex: 2,
        },
      },
    );

    const result = sequencerEdit.createPageSync(runtimePatch);

    expect(result?.update).toEqual({
      id: "track-1.runtime.stepSequencer",
      moduleType: ModuleType.StepSequencer,
      changes: {
        props: {
          activePageNo: 2,
        },
      },
    });
  });
});
