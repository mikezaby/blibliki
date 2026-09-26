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

  const externalRuntime = noteInputId
    ? track.createExternalMidiRuntime(
        { moduleId: noteInputId, ioName: "midi out" },
        { scopeBlockPlugs: true },
      )
    : { modules: [], routes: [] };

  if (trackDocument.noteSource !== "stepSequencer" || !stepSequencerId) {
    return externalRuntime;
  }

  // The sequencer joins external midi at the voice scheduler, so both share
  // one voice allocation. With a note input the scheduler and its outgoing
  // routes already exist, and only the sequencer's own route is new.
  const sequencerRuntime = track.createInternalMidiRuntime(
    { moduleId: stepSequencerId, ioName: "midi" },
    { scopeBlockPlugs: true, includeModules: !noteInputId },
  );
  const externalRouteIds = new Set(
    externalRuntime.routes.map((route) => route.id),
  );

  return {
    modules: [...externalRuntime.modules, ...sequencerRuntime.modules],
    routes: [
      ...externalRuntime.routes,
      ...sequencerRuntime.routes.filter(
        (route) => !externalRouteIds.has(route.id),
      ),
    ],
  };
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
    "masterId" | "sessionRecorderId" | "metronomeId"
  >,
): IRoute[] {
  const masterTrack = findMasterTrack(trackDocuments, tracks);
  const masterOutputPlugs = scopeTrackIO(
    masterTrack.key,
    masterTrack,
    masterTrack.findOutput("audio out"),
    "output",
  ).plugs;
  const metronomeOutput = {
    moduleId: runtime.metronomeId,
    ioName: "out",
  };

  return [
    ...createInstrumentAudioRoutes({ trackDocuments, tracks, masterTrack }),
    // The master track output feeds the engine Master, and is tapped
    // non-destructively by the session recorder (AudioRecorder passes audio
    // through, so it doesn't alter the chain).
    ...createExpandedRoutes("instrument", masterOutputPlugs, [
      { moduleId: runtime.sessionRecorderId, ioName: "in" },
    ]),
    ...(runtime.masterId
      ? [
          ...createExpandedRoutes("instrument", masterOutputPlugs, [
            { moduleId: runtime.masterId, ioName: "in" },
          ]),
          // The click goes straight to the Master, past the session
          // recorder, so a recording never has it.
          {
            id: createRuntimeRouteId("instrument", metronomeOutput, {
              moduleId: runtime.masterId,
              ioName: "in",
            }),
            source: metronomeOutput,
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
    | "masterId"
    | "sessionRecorderId"
    | "metronomeId"
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
