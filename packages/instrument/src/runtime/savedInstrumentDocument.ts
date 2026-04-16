import {
  PlaybackMode,
  Resolution,
  stepPropSchema,
  type IEngineSerialize,
} from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type {
  InstrumentDocument,
  InstrumentSequencerStep,
  InstrumentTrackControllerSlotValues,
  InstrumentTrackDocument,
} from "@/document/types";

function isTrackEnabled(trackDocument: InstrumentTrackDocument) {
  return trackDocument.enabled !== false;
}

function isSlotValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isSequencerDivision(
  value: unknown,
): value is InstrumentSequencerStep["duration"] {
  return (
    typeof value === "string" &&
    stepPropSchema.duration.options.includes(
      value as (typeof stepPropSchema.duration.options)[number],
    )
  );
}

function isResolution(value: unknown): value is Resolution {
  return (
    typeof value === "string" &&
    Object.values(Resolution).includes(value as Resolution)
  );
}

function isPlaybackMode(value: unknown): value is PlaybackMode {
  return (
    typeof value === "string" &&
    Object.values(PlaybackMode).includes(value as PlaybackMode)
  );
}

function getModuleProps(
  patch: IEngineSerialize,
  moduleId: string | undefined,
): Record<string, unknown> | undefined {
  if (!moduleId) {
    return;
  }

  const module = patch.modules.find((candidate) => candidate.id === moduleId);

  return module?.props as Record<string, unknown> | undefined;
}

function createSavedGlobalBlock(
  document: InstrumentDocument,
  runtimePatch: CompiledInstrumentEnginePatch,
  patch: IEngineSerialize,
) {
  const transportControlProps = getModuleProps(
    patch,
    runtimePatch.runtime.transportControlId,
  );
  const masterFilterProps = getModuleProps(
    patch,
    runtimePatch.runtime.masterFilterId,
  );
  const delayProps = getModuleProps(patch, runtimePatch.runtime.globalDelayId);
  const reverbProps = getModuleProps(
    patch,
    runtimePatch.runtime.globalReverbId,
  );
  const masterVolumeProps = getModuleProps(
    patch,
    runtimePatch.runtime.masterVolumeId,
  );

  return {
    tempo:
      typeof transportControlProps?.bpm === "number"
        ? transportControlProps.bpm
        : document.globalBlock.tempo,
    swing:
      typeof transportControlProps?.swing === "number"
        ? transportControlProps.swing
        : document.globalBlock.swing,
    masterFilterCutoff:
      typeof masterFilterProps?.cutoff === "number"
        ? masterFilterProps.cutoff
        : document.globalBlock.masterFilterCutoff,
    masterFilterResonance:
      typeof masterFilterProps?.Q === "number"
        ? masterFilterProps.Q
        : document.globalBlock.masterFilterResonance,
    delaySend:
      typeof delayProps?.mix === "number"
        ? delayProps.mix
        : document.globalBlock.delaySend,
    reverbSend:
      typeof reverbProps?.mix === "number"
        ? reverbProps.mix
        : document.globalBlock.reverbSend,
    masterVolume:
      typeof masterVolumeProps?.gain === "number"
        ? masterVolumeProps.gain
        : document.globalBlock.masterVolume,
  };
}

function createSavedControllerSlotValues(
  track: CompiledInstrumentEnginePatch["compiledInstrument"]["tracks"][number],
  patch: IEngineSerialize,
): InstrumentTrackControllerSlotValues | undefined {
  const slotValues: InstrumentTrackControllerSlotValues = {};

  for (const page of track.compiledTrack.launchControlXL3.resolvedPages) {
    for (const region of page.regions) {
      for (const slot of region.slots) {
        if (slot.kind !== "slot") {
          continue;
        }

        const value = getModuleProps(patch, slot.binding.moduleId)?.[
          slot.binding.propKey
        ];

        if (!isSlotValue(value)) {
          continue;
        }

        slotValues[`${slot.blockKey}.${slot.slotKey}`] = value;
      }
    }
  }

  return Object.keys(slotValues).length > 0 ? slotValues : undefined;
}

function createSavedSequencerStep(
  step: Record<string, unknown>,
): InstrumentSequencerStep {
  return {
    active: step.active === true,
    notes: Array.isArray(step.notes)
      ? step.notes.flatMap((note) => {
          if (
            note &&
            typeof note === "object" &&
            typeof (note as { note?: unknown }).note === "string" &&
            typeof (note as { velocity?: unknown }).velocity === "number"
          ) {
            return [
              {
                note: (note as { note: string }).note,
                velocity: (note as { velocity: number }).velocity,
              },
            ];
          }

          return [];
        })
      : [],
    probability: typeof step.probability === "number" ? step.probability : 100,
    microtimeOffset:
      typeof step.microtimeOffset === "number" ? step.microtimeOffset : 0,
    duration: isSequencerDivision(step.duration) ? step.duration : "1/16",
  };
}

function createSavedTrackDocument(
  trackDocument: InstrumentTrackDocument,
  runtimePatch: CompiledInstrumentEnginePatch,
  patch: IEngineSerialize,
): InstrumentTrackDocument {
  if (!isTrackEnabled(trackDocument)) {
    return trackDocument;
  }

  const compiledTrack = runtimePatch.compiledInstrument.tracks.find(
    (candidate) => candidate.key === trackDocument.key,
  );

  if (!compiledTrack) {
    return trackDocument;
  }

  const stepSequencerId =
    runtimePatch.runtime.stepSequencerIds[trackDocument.key];
  const stepSequencerProps = getModuleProps(patch, stepSequencerId);
  const patternIndex =
    typeof stepSequencerProps?.activePatternNo === "number"
      ? stepSequencerProps.activePatternNo
      : 0;
  const patterns = Array.isArray(stepSequencerProps?.patterns)
    ? (stepSequencerProps.patterns as Record<string, unknown>[])
    : [];
  const activePattern = patterns[patternIndex] ?? patterns[0];
  const pages = Array.isArray(activePattern?.pages)
    ? (activePattern.pages as Record<string, unknown>[])
    : undefined;

  return {
    ...trackDocument,
    controllerSlotValues: createSavedControllerSlotValues(compiledTrack, patch),
    sequencer: pages
      ? {
          pages: pages.map((page, pageIndex) => ({
            name:
              typeof page.name === "string"
                ? page.name
                : (trackDocument.sequencer.pages[pageIndex]?.name ??
                  `Page ${pageIndex + 1}`),
            steps: Array.isArray(page.steps)
              ? page.steps.map((step) =>
                  createSavedSequencerStep(step as Record<string, unknown>),
                )
              : (trackDocument.sequencer.pages[pageIndex]?.steps ?? []),
          })),
          loopLength:
            typeof stepSequencerProps?.loopLength === "number"
              ? (stepSequencerProps.loopLength as 1 | 2 | 3 | 4)
              : trackDocument.sequencer.loopLength,
          resolution: isResolution(stepSequencerProps?.resolution)
            ? stepSequencerProps.resolution
            : trackDocument.sequencer.resolution,
          playbackMode: isPlaybackMode(stepSequencerProps?.playbackMode)
            ? stepSequencerProps.playbackMode
            : trackDocument.sequencer.playbackMode,
        }
      : trackDocument.sequencer,
  };
}

export function createSavedInstrumentDocument(
  document: InstrumentDocument,
  runtimePatch: CompiledInstrumentEnginePatch,
  patch: IEngineSerialize,
): InstrumentDocument {
  return {
    ...document,
    globalBlock: createSavedGlobalBlock(document, runtimePatch, patch),
    tracks: document.tracks.map((trackDocument) =>
      createSavedTrackDocument(trackDocument, runtimePatch, patch),
    ),
  };
}
