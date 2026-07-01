import type { IRoute } from "@blibliki/engine";
import { scopeTrackIO } from "@/compiler/scoping";
import {
  createExpandedRoutes,
  createRuntimeRouteId,
} from "@/core/runtimeRoutes";
import type { InstrumentTrackDocument } from "@/document/types";
import type BaseTrack from "@/tracks/BaseTrack";
import { createInstrumentAudioRoutes } from "./instrumentAudioRouting";
import type { SerializableRuntimeModule } from "./instrumentRuntimeModules";
import { isAudioBusTrack, isMasterTrack } from "./instrumentRuntimeState";
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
  if (isAudioBusTrack(trackDocument.audioSource)) {
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

function findMasterTrack(
  trackDocuments: readonly InstrumentTrackDocument[],
  tracks: readonly BaseTrack[],
): BaseTrack {
  const masterTrackDocument = trackDocuments.find((trackDocument) =>
    isMasterTrack(trackDocument.audioSource),
  );
  if (!masterTrackDocument) {
    throw new Error("Instrument is missing a master track");
  }

  const masterTrack = tracks.find(
    (track) => track.key === masterTrackDocument.key,
  );
  if (!masterTrack) {
    throw new Error("Instrument master track instance was not compiled");
  }

  return masterTrack;
}

export function createMasterRoutes(
  trackDocuments: readonly InstrumentTrackDocument[],
  tracks: readonly BaseTrack[],
  runtime: Pick<
    CompiledInstrumentEnginePatch["runtime"],
    "masterId" | "sessionRecorderId"
  >,
): IRoute[] {
  const masterTrack = findMasterTrack(trackDocuments, tracks);
  const masterOutputPlugs = scopeTrackIO(
    masterTrack.key,
    masterTrack,
    masterTrack.findOutput("audio out"),
    "output",
  ).plugs;

  return [
    ...createInstrumentAudioRoutes({ trackDocuments, tracks, masterTrack }),
    // The master track output feeds the engine Master, and is tapped
    // non-destructively by the session recorder (AudioRecorder passes audio
    // through, so it doesn't alter the chain).
    ...createExpandedRoutes("instrument", masterOutputPlugs, [
      { moduleId: runtime.sessionRecorderId, ioName: "in" },
    ]),
    ...(runtime.masterId
      ? createExpandedRoutes("instrument", masterOutputPlugs, [
          { moduleId: runtime.masterId, ioName: "in" },
        ])
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
    | "masterId"
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
