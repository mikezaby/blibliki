import type { IRoute } from "@blibliki/engine";
import type { BlockPlug } from "@/blocks/types";
import {
  createExpandedRoutes,
  createRuntimeRouteId,
} from "@/core/runtimeRoutes";
import type { InstrumentTrackDocument } from "@/document/types";
import type BaseTrack from "@/tracks/BaseTrack";
import type { SerializableRuntimeModule } from "./instrumentRuntimeModules";
import type { CompiledInstrumentEnginePatch } from "./instrumentTypes";
import { scopeTrackIO } from "./scoping";

export function createTrackNoteRuntime(
  track: BaseTrack,
  trackDocument: InstrumentTrackDocument,
  noteInputId: string | undefined,
  stepSequencerId: string | undefined,
): {
  modules: SerializableRuntimeModule[];
  routes: IRoute[];
} {
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
  tracks: readonly BaseTrack[],
  runtime: Pick<
    CompiledInstrumentEnginePatch["runtime"],
    | "masterId"
    | "masterFilterId"
    | "globalDelayId"
    | "globalReverbId"
    | "masterVolumeId"
  >,
): IRoute[] {
  const mixDestinationPlugs: BlockPlug[] = [
    { moduleId: runtime.masterFilterId, ioName: "in" },
  ];

  return [
    ...tracks.flatMap((track) =>
      createExpandedRoutes(
        track.key,
        scopeTrackIO(track.key, track, track.findOutput("audio out"), "output")
          .plugs,
        mixDestinationPlugs,
      ),
    ),
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
