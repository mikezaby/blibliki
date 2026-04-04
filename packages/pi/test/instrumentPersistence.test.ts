import {
  PlaybackMode,
  Resolution,
  type IEngineSerialize,
} from "@blibliki/engine";
import {
  createInstrumentEnginePatch,
  createDefaultInstrumentDocument,
  type CompiledLaunchControlXL3Page,
} from "@blibliki/instrument";
import { describe, expect, it } from "vitest";
import { createSavedInstrumentDocument } from "@/instrumentPersistence";

function updateModuleProps(
  patch: IEngineSerialize,
  moduleId: string,
  updater: (props: Record<string, unknown>) => Record<string, unknown>,
) {
  return {
    ...patch,
    modules: patch.modules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            props: updater(module.props as Record<string, unknown>),
          }
        : module,
    ),
  };
}

function getControllerSlot(
  pages: readonly CompiledLaunchControlXL3Page[],
  blockKey: string,
  slotKey: string,
) {
  return pages
    .flatMap((page) => page.regions)
    .flatMap((region) => region.slots)
    .find(
      (slot) =>
        slot.kind === "slot" &&
        slot.blockKey === blockKey &&
        slot.slotKey === slotKey,
    );
}

describe("createSavedInstrumentDocument", () => {
  it("captures live controller, sequencer, and global values into the instrument document", () => {
    const document = createDefaultInstrumentDocument();
    const firstTrack = document.tracks[0];

    if (!firstTrack) {
      throw new Error("Expected default instrument to include a first track");
    }

    document.tracks[0] = {
      ...firstTrack,
      sourceProfileId: "osc",
      noteSource: "stepSequencer",
    };

    const runtimePatch = createInstrumentEnginePatch(document);
    const activeTrack = runtimePatch.compiledInstrument.tracks[0];

    if (!activeTrack) {
      throw new Error("Expected compiled instrument to include a first track");
    }

    const driveSlot = getControllerSlot(
      activeTrack.compiledTrack.launchControlXL3.resolvedPages,
      "fx1",
      "drive",
    );

    if (!driveSlot || driveSlot.kind !== "slot") {
      throw new Error("Expected an fx1.drive controller slot");
    }

    const stepSequencerId =
      runtimePatch.runtime.stepSequencerIds[firstTrack.key];
    if (!stepSequencerId) {
      throw new Error(
        "Expected a step sequencer runtime id for the first track",
      );
    }

    let livePatch = updateModuleProps(
      runtimePatch.patch,
      runtimePatch.runtime.transportControlId,
      (props) => ({
        ...props,
        bpm: 138,
        swing: 18,
      }),
    );
    livePatch = updateModuleProps(
      livePatch,
      runtimePatch.runtime.masterFilterId,
      (props) => ({
        ...props,
        cutoff: 1400,
        Q: 6.5,
      }),
    );
    livePatch = updateModuleProps(
      livePatch,
      runtimePatch.runtime.globalDelayId,
      (props) => ({
        ...props,
        mix: 0.37,
      }),
    );
    livePatch = updateModuleProps(
      livePatch,
      runtimePatch.runtime.globalReverbId,
      (props) => ({
        ...props,
        mix: 0.61,
      }),
    );
    livePatch = updateModuleProps(
      livePatch,
      runtimePatch.runtime.masterVolumeId,
      (props) => ({
        ...props,
        gain: 0.84,
      }),
    );
    livePatch = updateModuleProps(
      livePatch,
      driveSlot.binding.moduleId,
      (props) => ({
        ...props,
        [driveSlot.binding.propKey]: 0.91,
      }),
    );
    livePatch = updateModuleProps(livePatch, stepSequencerId, (props) => ({
      ...props,
      loopLength: 3,
      resolution: Resolution.eighth,
      playbackMode: PlaybackMode.oneShot,
      patterns: [
        {
          ...(props.patterns as Record<string, unknown>[])[0],
          pages: [
            {
              name: "Page 1",
              steps: Array.from({ length: 16 }, (_, index) =>
                index === 0
                  ? {
                      active: true,
                      notes: [{ note: "C4", velocity: 112 }],
                      ccMessages: [],
                      probability: 73,
                      microtimeOffset: 9,
                      duration: "1/8",
                    }
                  : {
                      active: false,
                      notes: [],
                      ccMessages: [],
                      probability: 100,
                      microtimeOffset: 0,
                      duration: "1/16",
                    },
              ),
            },
            ...(
              props.patterns as { pages: Record<string, unknown>[] }[]
            )[0]!.pages.slice(1),
          ],
        },
      ],
    }));

    const savedDocument = createSavedInstrumentDocument(
      document,
      runtimePatch,
      livePatch,
    );

    expect(savedDocument.globalBlock).toEqual({
      tempo: 138,
      swing: 18,
      masterFilterCutoff: 1400,
      masterFilterResonance: 6.5,
      delaySend: 0.37,
      reverbSend: 0.61,
      masterVolume: 0.84,
    });
    expect(savedDocument.tracks[0]?.controllerSlotValues).toMatchObject({
      "fx1.drive": 0.91,
    });
    expect(savedDocument.tracks[0]?.sequencer.loopLength).toBe(3);
    expect(savedDocument.tracks[0]?.sequencer.resolution).toBe(
      Resolution.eighth,
    );
    expect(savedDocument.tracks[0]?.sequencer.playbackMode).toBe(
      PlaybackMode.oneShot,
    );
    expect(savedDocument.tracks[0]?.sequencer.pages[0]?.steps[0]).toEqual({
      active: true,
      notes: [{ note: "C4", velocity: 112 }],
      probability: 73,
      microtimeOffset: 9,
      duration: "1/8",
    });
  });
});
