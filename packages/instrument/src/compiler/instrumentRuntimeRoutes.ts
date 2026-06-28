import type { IRoute } from "@blibliki/engine";
import { createRuntimeRouteId } from "@/core/runtimeRoutes";
import type { InstrumentTrackDocument } from "@/document/types";
import type BaseTrack from "@/tracks/BaseTrack";
import { createInstrumentAudioRoutes } from "./instrumentAudioRouting";
import type { SerializableRuntimeModule } from "./instrumentRuntimeModules";
import type { CompiledInstrumentEnginePatch } from "./instrumentTypes";

export type InstrumentTrackNoteRuntime = {
  modules: SerializableRuntimeModule[];
  routes: IRoute[];
};

export function createTrackNoteRuntime(
  track: BaseTrack,
  trackDocument: InstrumentTrackDocument,
  noteInputId: string | undefined,
  stepSequencerId: string | undefined,
): InstrumentTrackNoteRuntime {
  if (trackDocument.audioSource?.type === "track") {
    return { modules: [], routes: [] };
  }

  if (trackDocument.noteSource === "stepSequencer") {
    if (!stepSequencerId) {
      return { modules: [], routes: [] };
    }

    return track.createInternalMidiRuntime(
      { moduleId: stepSequencerId, ioName: "midi" },
      { scopeBlockPlugs: true },
    );
  }

  if (!noteInputId) {
    return { modules: [], routes: [] };
  }

  return track.createExternalMidiRuntime(
    {
      moduleId: noteInputId,
      ioName: "midi out",
    },
    { scopeBlockPlugs: true },
  );
}

export function createMasterRoutes(
  trackDocuments: readonly InstrumentTrackDocument[],
  tracks: readonly BaseTrack[],
  runtime: Pick<
    CompiledInstrumentEnginePatch["runtime"],
    | "masterId"
    | "masterFilterId"
    | "globalDelayId"
    | "globalReverbId"
    | "masterVolumeId"
    | "sessionRecorderId"
  >,
): IRoute[] {
  return [
    ...createInstrumentAudioRoutes({
      trackDocuments,
      tracks,
      masterFilterId: runtime.masterFilterId,
    }),
    // Non-destructive tap: the session recorder listens to the final mix
    // (AudioRecorder passes audio through, so it doesn't alter the chain).
    {
      id: createRuntimeRouteId(
        "instrument",
        { moduleId: runtime.masterVolumeId, ioName: "out" },
        { moduleId: runtime.sessionRecorderId, ioName: "in" },
      ),
      source: { moduleId: runtime.masterVolumeId, ioName: "out" },
      destination: { moduleId: runtime.sessionRecorderId, ioName: "in" },
    },
    {
      id: createRuntimeRouteId(
        "instrument",
        { moduleId: runtime.masterFilterId, ioName: "out" },
        { moduleId: runtime.globalDelayId, ioName: "in" },
      ),
      source: { moduleId: runtime.masterFilterId, ioName: "out" },
      destination: { moduleId: runtime.globalDelayId, ioName: "in" },
    },
    {
      id: createRuntimeRouteId(
        "instrument",
        { moduleId: runtime.globalDelayId, ioName: "out" },
        { moduleId: runtime.globalReverbId, ioName: "in" },
      ),
      source: { moduleId: runtime.globalDelayId, ioName: "out" },
      destination: { moduleId: runtime.globalReverbId, ioName: "in" },
    },
    {
      id: createRuntimeRouteId(
        "instrument",
        { moduleId: runtime.globalReverbId, ioName: "out" },
        { moduleId: runtime.masterVolumeId, ioName: "in" },
      ),
      source: { moduleId: runtime.globalReverbId, ioName: "out" },
      destination: { moduleId: runtime.masterVolumeId, ioName: "in" },
    },
    ...(runtime.masterId
      ? [
          {
            id: createRuntimeRouteId(
              "instrument",
              { moduleId: runtime.masterVolumeId, ioName: "out" },
              { moduleId: runtime.masterId, ioName: "in" },
            ),
            source: { moduleId: runtime.masterVolumeId, ioName: "out" },
            destination: { moduleId: runtime.masterId, ioName: "in" },
          },
        ]
      : []),
  ];
}

export function createControllerRoutes(
  controllerInputId: string | undefined,
  midiMapperId: string,
  controllerOutputId: string | undefined,
): IRoute[] {
  const routes: IRoute[] = [];

  if (controllerInputId) {
    routes.push({
      id: createRuntimeRouteId(
        "instrument",
        { moduleId: controllerInputId, ioName: "midi out" },
        { moduleId: midiMapperId, ioName: "midi in" },
      ),
      source: { moduleId: controllerInputId, ioName: "midi out" },
      destination: { moduleId: midiMapperId, ioName: "midi in" },
    });
  }

  if (controllerOutputId) {
    routes.push({
      id: createRuntimeRouteId(
        "instrument",
        { moduleId: midiMapperId, ioName: "midi out" },
        { moduleId: controllerOutputId, ioName: "midi in" },
      ),
      source: { moduleId: midiMapperId, ioName: "midi out" },
      destination: { moduleId: controllerOutputId, ioName: "midi in" },
    });
  }

  return routes;
}

export function createInstrumentRuntimeRoutes(options: {
  trackDocuments: readonly InstrumentTrackDocument[];
  trackInstances: readonly BaseTrack[];
  runtime: Pick<
    CompiledInstrumentEnginePatch["runtime"],
    | "controllerInputId"
    | "controllerOutputId"
    | "globalDelayId"
    | "globalReverbId"
    | "masterFilterId"
    | "masterId"
    | "masterVolumeId"
    | "sessionRecorderId"
    | "midiMapperId"
  >;
  trackNoteRuntimes: readonly InstrumentTrackNoteRuntime[];
}): IRoute[] {
  const { trackDocuments, trackInstances, runtime, trackNoteRuntimes } =
    options;

  return [
    ...trackNoteRuntimes.flatMap(({ routes }) => routes),
    ...createControllerRoutes(
      runtime.controllerInputId,
      runtime.midiMapperId,
      runtime.controllerOutputId,
    ),
    ...createMasterRoutes(trackDocuments, trackInstances, runtime),
  ];
}
