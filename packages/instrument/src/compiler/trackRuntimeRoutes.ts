import type { IRoute } from "@blibliki/engine";
import type { BlockPlug } from "@/blocks/types";
import {
  createExpandedRoutes,
  createRuntimeRouteId,
} from "@/core/runtimeRoutes";
import type BaseTrack from "@/tracks/BaseTrack";
import { resolveTrackIO } from "./scoping";

export function createTrackControllerRoutes(
  trackKey: string,
  controllerInputId: string | undefined,
  midiMapperId: string,
  controllerOutputId: string | undefined,
): IRoute[] {
  const routes: IRoute[] = [];

  if (controllerInputId) {
    routes.push({
      id: createRuntimeRouteId(
        trackKey,
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
        trackKey,
        { moduleId: midiMapperId, ioName: "midi out" },
        { moduleId: controllerOutputId, ioName: "midi in" },
      ),
      source: { moduleId: midiMapperId, ioName: "midi out" },
      destination: { moduleId: controllerOutputId, ioName: "midi in" },
    });
  }

  return routes;
}

export function createTrackMasterRoutes(
  track: BaseTrack,
  masterId: string,
): IRoute[] {
  const audioOut = track.findOutput("audio out");
  const destinationPlugs: BlockPlug[] = [{ moduleId: masterId, ioName: "in" }];

  return createExpandedRoutes(
    track.key,
    resolveTrackIO(track, audioOut, "output").plugs,
    destinationPlugs,
  );
}
